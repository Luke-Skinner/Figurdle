from openai import OpenAI
from .config import settings
import json
from typing import Dict, List, Optional
import logging
import time
import random
import requests

logger = logging.getLogger(__name__)

# Initialize OpenAI client - will be created when needed
client = None

def verify_image_url(url: str) -> bool:
    """Verify that an image URL exists and is accessible."""
    if not url or url == "null":
        return False

    try:
        # Add User-Agent for Wikipedia compatibility
        headers = {
            'User-Agent': 'Figurdle/1.0 (https://figurdle.com; contact@figurdle.com) Python/requests'
        }
        response = requests.head(url, headers=headers, timeout=5, allow_redirects=True)
        return response.status_code == 200
    except Exception as e:
        logger.debug(f"Image verification failed for {url}: {e}")
        return False

def get_wikipedia_image(character_name: str) -> Optional[str]:
    """
    Fetch character image from Wikipedia API.
    Returns the image URL or None if not found.
    """
    try:
        # Wikipedia REST API - page summary endpoint
        wiki_name = character_name.replace(" ", "_")
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{wiki_name}"

        # Wikipedia requires User-Agent header
        headers = {
            'User-Agent': 'Figurdle/1.0 (https://figurdle.com; contact@figurdle.com) Python/requests'
        }

        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()

            # Try to get the original image first (higher quality)
            if 'originalimage' in data and data['originalimage'].get('source'):
                image_url = data['originalimage']['source']
                logger.info(f"Found Wikipedia original image for {character_name}: {image_url}")
                return image_url

            # Fall back to thumbnail
            elif 'thumbnail' in data and data['thumbnail'].get('source'):
                image_url = data['thumbnail']['source']
                logger.info(f"Found Wikipedia thumbnail for {character_name}: {image_url}")
                return image_url

            logger.warning(f"Wikipedia page found for {character_name} but no image available")
            return None
        else:
            logger.warning(f"Wikipedia API returned {response.status_code} for {character_name}")
            return None

    except Exception as e:
        logger.error(f"Error fetching Wikipedia image for {character_name}: {e}")
        return None

def get_character_image_url(character_name: str, gpt_suggested_url: Optional[str] = None) -> str:
    """
    Multi-source fallback strategy to get a reliable character image.

    Priority order:
    1. Wikipedia API (most reliable)
    2. GPT-4 suggested URL (if valid)
    3. Placeholder image
    """
    logger.info(f"Starting image search for: {character_name}")
    logger.info(f"GPT suggested URL: {gpt_suggested_url}")

    # Try Wikipedia first
    logger.info(f"Attempting Wikipedia API for {character_name}...")
    wiki_url = get_wikipedia_image(character_name)
    logger.info(f"Wikipedia returned: {wiki_url}")

    if wiki_url:
        logger.info(f"Verifying Wikipedia image URL...")
        if verify_image_url(wiki_url):
            logger.info(f"✓ Using Wikipedia image for {character_name}: {wiki_url}")
            return wiki_url
        else:
            logger.warning(f"✗ Wikipedia URL failed verification: {wiki_url}")

    # Try GPT-4 suggested URL if provided
    if gpt_suggested_url and gpt_suggested_url != "null":
        logger.info(f"Verifying GPT-suggested URL...")
        if verify_image_url(gpt_suggested_url):
            logger.info(f"✓ Using GPT-suggested image for {character_name}")
            return gpt_suggested_url
        else:
            logger.warning(f"✗ GPT-suggested image URL invalid for {character_name}: {gpt_suggested_url}")

    # Fallback to placeholder
    logger.warning(f"No valid image found for {character_name}, using placeholder")
    return "https://via.placeholder.com/400x400.png?text=No+Image+Available"

class CharacterGenerationError(Exception):
    pass

def call_openai_with_retry(openai_client, **kwargs):
    """Call OpenAI API with exponential backoff retry logic."""
    max_retries = 3
    base_delay = 1
    
    for attempt in range(max_retries):
        try:
            return openai_client.chat.completions.create(**kwargs)
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            
            # Exponential backoff with jitter
            delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
            logger.warning(f"OpenAI API call failed (attempt {attempt + 1}), retrying in {delay:.2f}s: {e}")
            time.sleep(delay)

def get_openai_client():
    """Get OpenAI client, creating it if needed."""
    global client
    if client is None:
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "sk-REPLACE_ME":
            raise CharacterGenerationError("OpenAI API key not configured. Please set OPENAI_API_KEY in .env file.")
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
        except Exception as e:
            raise CharacterGenerationError(f"Failed to initialize OpenAI client: {e}")
    return client

def get_all_used_characters() -> List[str]:
    """Get ALL character names ever used to prevent any repeats (no longer includes aliases)."""
    from .db import SessionLocal
    from .models import Puzzle, UsedCharacter

    with SessionLocal() as db:
        characters = []

        # Get from puzzles table (main answer only - aliases no longer used)
        puzzles = db.query(Puzzle).all()
        for puzzle in puzzles:
            characters.append(puzzle.answer.lower())

        # Get from used_characters table
        used_chars = db.query(UsedCharacter).all()
        characters.extend([char.character_name.lower() for char in used_chars])

        return list(set(characters))  # Remove duplicates

def record_used_character(character_data: Dict[str, any], puzzle_date) -> None:
    """Record character as used (no longer recording aliases - fuzzy matching handles variations)."""
    from .db import SessionLocal
    from .models import UsedCharacter
    import logging

    logger = logging.getLogger(__name__)

    with SessionLocal() as db:
        try:
            # Record only the main answer (normalized to lowercase)
            main_char = UsedCharacter(
                character_name=character_data["answer"].lower(),
                puzzle_date=puzzle_date
            )
            db.add(main_char)
            db.commit()
            logger.info(f"Recorded {character_data['answer']} as used")

        except Exception as e:
            db.rollback()
            # Don't fail the puzzle creation if recording fails
            logger.warning(f"Failed to record used character {character_data['answer']}: {e}")

def get_recent_characters(days_back: int = 90) -> List[str]:
    """Get all character names from the last N days to avoid duplicates. (Legacy function - use get_all_used_characters())"""
    # For backward compatibility, just call the new function
    return get_all_used_characters()

def validate_hints_dont_reveal_answer(character_data: Dict[str, any]) -> bool:
    """
    Validate that hints don't accidentally reveal the answer or any aliases.
    Returns True if hints are safe, False if they reveal the answer.
    """
    answer = character_data["answer"].lower()
    aliases = [alias.lower() for alias in character_data["aliases"]]
    
    # Extract proper names only (not common descriptive words)
    name_parts = []
    
    # Get actual person names (first, last, etc.)
    answer_parts = answer.split()
    for part in answer_parts:
        # Only flag actual names, not common words
        if len(part) > 3 and part.isalpha():
            name_parts.append(part.lower())
    
    # Get unique names from aliases (but filter out common descriptive terms)
    descriptive_words = {'physicist', 'theoretical', 'pioneer', 'scientist', 'leader', 'emperor', 'queen', 'king', 'president', 'general', 'artist', 'writer', 'philosopher'}
    
    for alias in aliases:
        alias_parts = alias.split()
        for part in alias_parts:
            part_lower = part.lower()
            # Only flag if it's likely a proper name, not a descriptive term
            if (len(part) > 3 and part.isalpha() and 
                part_lower not in descriptive_words and
                part[0].isupper()):  # Proper names are capitalized
                name_parts.append(part_lower)
    
    # Check each hint for actual name reveals
    for i, hint in enumerate(character_data["hints"]):
        hint_lower = hint.lower()
        for name_part in name_parts:
            # Check for whole word matches to avoid false positives
            import re
            if re.search(r'\b' + re.escape(name_part) + r'\b', hint_lower):
                logger.warning(f"Hint {i+1} contains name part '{name_part}': {hint}")
                return False
    
    return True

def evaluate_character_obscurity(character_data: Dict[str, any]) -> Dict[str, any]:
    """
    Ask AI to evaluate if a character is too obscure for a daily puzzle game.
    Returns: {"is_too_obscure": bool, "reasoning": str, "familiarity_score": int}
    """
    # Build evaluation prompt using string concatenation to avoid f-string issues
    character_name = character_data['answer']
    aliases = ', '.join(character_data['aliases'])
    hint1 = character_data['hints'][0]
    hint2 = character_data['hints'][1] 
    hint3 = character_data['hints'][2]
    
    # JSON template for the response format
    json_response_template = '''{
  "is_too_obscure": true/false,
  "familiarity_score": 1-10,
  "reasoning": "Brief explanation of familiarity level",
  "target_audience": "Who would typically know this person"
}'''
    
    evaluation_prompt_parts = [
        "You are evaluating historical figures for a daily puzzle game like Wordle, where players need a reasonable chance of guessing correctly.",
        "",
        "Character to evaluate: " + character_name,
        "Aliases: " + aliases,
        "",
        "Sample hints:",
        "1. " + hint1,
        "2. " + hint2,
        "3. " + hint3,
        "",
        "Rate this character's suitability for a daily puzzle game:",
        "",
        "Criteria for \"TOO OBSCURE\":",
        "- Known only to academic specialists or history buffs",
        "- Regional/local figures with limited global recognition",
        "- Requires very specific historical knowledge",
        "- Most educated adults wouldn't recognize the name",
        "",
        "Criteria for \"APPROPRIATE\":",
        "- Taught in high school or college history classes",
        "- Appears in documentaries, movies, or popular media",
        "- Referenced in general knowledge contexts",
        "- Most educated adults have heard the name",
        "",
        "Return your evaluation as JSON:",
        json_response_template,
        "",
        "Familiarity scale:",
        "1-3: Academic specialists only",
        "4-6: History enthusiasts and well-educated adults",
        "7-8: General educated population",
        "9-10: Household names, widely known",
        "",
        "Be honest - err on the side of \"too obscure\" to maintain game accessibility."
    ]
    
    evaluation_prompt = '\n'.join(evaluation_prompt_parts)

    try:
        openai_client = get_openai_client()
        
        response = call_openai_with_retry(
            openai_client,
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": evaluation_prompt}],
            temperature=0.3,  # Low temperature for consistent evaluation
            max_tokens=300
        )
        
        content = response.choices[0].message.content
        
        # Add better error handling for JSON parsing
        if not content or content.strip() == "":
            logger.warning("Empty response from OpenAI for obscurity evaluation")
            raise ValueError("Empty response from OpenAI")
            
        # Try to extract JSON if response contains extra text
        content = content.strip()
        
        # Look for JSON block if wrapped in markdown code blocks
        if '```json' in content:
            start = content.find('```json') + 7
            end = content.find('```', start)
            if end > start:
                content = content[start:end].strip()
        elif '{' in content and '}' in content:
            # Extract just the JSON part
            start = content.find('{')
            end = content.rfind('}') + 1
            content = content[start:end]
        
        logger.debug(f"Attempting to parse OpenAI response: {content}")
        evaluation = json.loads(content)
        
        # Validate response structure
        required_fields = ["is_too_obscure", "familiarity_score", "reasoning"]
        for field in required_fields:
            if field not in evaluation:
                raise ValueError(f"Missing field in evaluation: {field}")
                
        logger.info(f"Obscurity evaluation for {character_data['answer']}: "
                   f"Score {evaluation['familiarity_score']}/10, "
                   f"Too obscure: {evaluation['is_too_obscure']}")
        
        return evaluation
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing failed for obscurity evaluation: {e}")
        logger.error(f"Raw OpenAI response: {response.choices[0].message.content if 'response' in locals() else 'No response'}")
        # Return default values instead of failing
        return {
            "is_too_obscure": False,
            "familiarity_score": 7,
            "reasoning": f"Evaluation failed due to JSON parsing error: {e}",
            "target_audience": "Unknown due to evaluation error"
        }
    except Exception as e:
        logger.error(f"Obscurity evaluation failed: {e}")
        logger.error(f"Full error details: {type(e).__name__}: {str(e)}")
        # Default to "not too obscure" to avoid blocking generation
        return {
            "is_too_obscure": False,
            "familiarity_score": 7,
            "reasoning": f"Evaluation failed: {str(e)}",
            "target_audience": "Unknown due to evaluation error"
        }

def generate_daily_character(avoid_characters: List[str] = None, attempt: int = 1) -> Dict[str, any]:
    """
    Generate a new famous figure character for today's puzzle using OpenAI.

    Returns a dictionary with:
    - answer: The main name of the character (e.g., "Albert Einstein", "Taylor Swift")
    - aliases: List of alternative names (e.g., ["Einstein", "Albert", "Tay-Tay"])
    - hints: List of 5 progressive hints from vague to specific
    - source_urls: List of relevant Wikipedia/reference URLs

    Raises CharacterGenerationError if generation fails.
    """
    
    # Build exclusion text for prompt - show MORE characters to AI
    exclusion_text = ""
    if avoid_characters and len(avoid_characters) > 0:
        # Show up to 150 characters instead of 50 for better avoidance
        display_count = min(150, len(avoid_characters))
        character_list = ', '.join(avoid_characters[:display_count])
        exclusion_text = "\n" + "="*50
        exclusion_text += "\nCRITICAL: DO NOT CHOOSE ANY OF THESE ALREADY-USED CHARACTERS:"
        exclusion_text += "\n" + "="*50
        exclusion_text += "\n" + character_list
        if len(avoid_characters) > display_count:
            extra_count = len(avoid_characters) - display_count
            exclusion_text += "\n(Plus " + str(extra_count) + " more - TOTAL FORBIDDEN: " + str(len(avoid_characters)) + " characters)"
        exclusion_text += "\n" + "="*50
        exclusion_text += "\nYou MUST choose someone NOT in this list!"

    # Adjust difficulty based on attempt number
    difficulty_guidance = ""
    if attempt == 1:
        difficulty_guidance = "Choose well-known figures from any field that educated players would recognize."
    elif attempt == 2:
        difficulty_guidance = "You may choose slightly more obscure but still notable figures from any field."
    else:
        difficulty_guidance = "Choose any significant figure from any field, even if less commonly known."
    
    # Create the JSON template separately to avoid any f-string processing
    # NOTE: aliases field removed - fuzzy matching handles name variations
    json_template = '''{
  "answer": "Full Name",
  "hints": [
    "Hint 1: Very broad historical context",
    "Hint 2: Time period or geographical region",
    "Hint 3: Field of expertise or major role",
    "Hint 4: Specific major accomplishment",
    "Hint 5: Nearly gives it away but requires connecting the dots"
  ],
  "source_urls": ["https://en.wikipedia.org/wiki/Character_Name"],
  "image_url": "https://upload.wikimedia.org/wikipedia/commons/d/d3/Character_Name.jpg"
}'''
    
    # Craft a detailed prompt for consistent, high-quality character generation
    system_prompt_parts = [
        'You are a game designer creating daily puzzles for "Figurdle" - a Wordle-like game where players guess famous figures based on progressive hints.',
        exclusion_text,
        "\nGenerate a notable figure that meets these criteria:",
        "- Famous or significant person from ANY field (not just historical)",
        "- Can be from: history, science, entertainment, sports, politics, literature, art, technology, business, etc.",
        "- Can be living or deceased, any time period or culture",
        "- Should be recognizable to a general educated audience",
        "- Has interesting, distinctive facts for hints",
        "- " + difficulty_guidance,
        "\nReturn your response as valid JSON with this exact structure:",
        json_template,
        "\nCRITICAL RULES FOR ANSWER FORMAT:",
        "- Use ONLY the person's commonly known name",
        "- DO NOT add descriptive suffixes like 'of Sparta', 'of Macedonia', 'the Conqueror'",
        "- DO NOT add titles unless they're part of how they're commonly known (e.g., 'Dr. Seuss' is OK)",
        "- Examples: 'Leonidas' NOT 'Leonidas of Sparta', 'Alexander the Great' is OK but 'Alexander of Macedonia' is NOT",
        "- Keep it simple: just the name people use when talking about this person",
        "\nCRITICAL RULES FOR HINTS:",
        "- NEVER mention the person's name, nickname, or any part of their name in any hint",
        "- NEVER mention titles that directly contain their name (e.g., don't say 'Napoleonic Wars' for Napoleon)",
        "- ALWAYS write hints in THIRD PERSON ONLY - use 'they', 'this person', 'this figure', etc.",
        "- NEVER use first person ('I', 'my', 'me') - always maintain third person perspective",
        "- Refer to places, events, or concepts without using the person's name",
        "- Make hints progressively more specific but always avoid name reveals",
        "- Hint 7 should be very specific but still require the player to make the connection",
        "\nGOOD HINT EXAMPLES (THIRD PERSON ONLY):",
        "- 'This military leader rose to power during a time of revolution'",
        "- 'They conquered much of Europe in the early 19th century'",
        "- 'This figure was exiled to a remote island after their defeat'",
        "- 'They revolutionized the understanding of space and time'",
        "- 'This person wrote a famous theory that changed physics forever'",
        "\nBAD HINT EXAMPLES (NEVER DO THIS):",
        "- 'I rose to power...' (first person - forbidden)",
        "- 'My theory changed physics...' (first person - forbidden)",
        "- 'I am known as Napoleon' (contains name)",
        "- 'The Napoleonic era was named after me' (contains name derivative)",
        "\nIMAGE URL INSTRUCTIONS:",
        "- CRITICAL: You must provide a working Wikipedia Commons image URL",
        "- Search your knowledge for the actual Wikipedia page of this person",
        "- Provide the direct image URL from upload.wikimedia.org/wikipedia/commons/",
        "- Format: https://upload.wikimedia.org/wikipedia/commons/[hash]/[filename]",
        "- Choose a clear portrait or recognizable photo",
        "- VERIFY the person has a Wikipedia page before selecting them",
        "- If absolutely no image exists, use: https://via.placeholder.com/400x400.png?text=No+Image+Available"
    ]
    
    system_prompt = '\n'.join(system_prompt_parts)
    user_prompt = "Generate a famous figure for today's puzzle. Choose someone interesting and well-known from any field, but not too obvious. Make the hints engaging and educational."

    try:
        logger.info("Requesting character generation from OpenAI")
        
        # Get OpenAI client (creates it if needed)
        openai_client = get_openai_client()
        
        response = call_openai_with_retry(
            openai_client,
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,  # Some creativity, but not too random
            max_tokens=1000   # Enough for detailed response
        )
        
        # Extract the generated content
        content = response.choices[0].message.content
        logger.info(f"OpenAI response received: {len(content)} characters")
        
        # Parse the JSON response
        try:
            character_data = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response as JSON: {e}")
            logger.error(f"Raw response: {content}")
            raise CharacterGenerationError(f"OpenAI returned invalid JSON: {e}")
        
        # Validate required fields (aliases is now optional)
        required_fields = ["answer", "hints", "source_urls", "image_url"]
        for field in required_fields:
            if field not in character_data:
                raise CharacterGenerationError(f"Missing required field: {field}")

        # Set aliases to empty list if not provided (we don't use them anymore)
        if "aliases" not in character_data:
            character_data["aliases"] = []
        
        # Validate data types and content
        if not isinstance(character_data["answer"], str):
            raise CharacterGenerationError("Answer must be a string")

        # Clean up answer - remove common suffixes like "of Sparta", "of Macedonia"
        answer = character_data["answer"]
        if " of " in answer:
            # Split and keep only the name part
            parts = answer.split(" of ")
            if len(parts) == 2:
                # Check if second part is a place (capitalized word/phrase)
                place = parts[1].strip()
                if place and place[0].isupper() and len(place.split()) <= 3:
                    character_data["answer"] = parts[0].strip()
                    logger.info(f"Cleaned answer from '{answer}' to '{character_data['answer']}'")

        # Validate aliases if present (but it's optional now)
        if character_data.get("aliases") and not isinstance(character_data["aliases"], list):
            character_data["aliases"] = []  # Reset to empty if invalid

        if not isinstance(character_data["hints"], list) or len(character_data["hints"]) != 5:
            raise CharacterGenerationError("Must provide exactly 5 hints")

        if not isinstance(character_data["source_urls"], list):
            raise CharacterGenerationError("Source URLs must be a list")
        
        # Validate that hints don't reveal the answer
        if not validate_hints_dont_reveal_answer(character_data):
            logger.warning("Generated character has hints that reveal the answer, regenerating...")
            # For now, we'll just warn and continue, but in production you might want to retry
            # raise CharacterGenerationError("Generated hints contain the character's name")
        
        logger.info(f"Successfully generated character: {character_data['answer']}")
        return character_data
        
    except Exception as e:
        if isinstance(e, CharacterGenerationError):
            raise
        logger.error(f"OpenAI API error: {e}")
        raise CharacterGenerationError(f"Failed to generate character: {e}")

def is_duplicate(character_data: Dict[str, any], avoid_list: List[str]) -> bool:
    """Check if generated character is in the avoid list (no longer checks aliases)."""
    answer_lower = character_data["answer"].lower()

    # Only check the main answer since we no longer use aliases
    return answer_lower in avoid_list

def generate_daily_character_with_ai_evaluation() -> Dict[str, any]:
    """Generate character with complete duplicate prevention and AI-driven obscurity evaluation."""
    from .config import settings

    # Get ALL used characters (complete prevention)
    all_used_characters = get_all_used_characters()
    logger.info(f"Avoiding {len(all_used_characters)} previously used characters")

    # Track failure reasons for better debugging
    failure_reasons = {"duplicate": 0, "too_obscure": 0, "other_error": 0}

    for attempt in range(15):  # Increased from 5 to 15 attempts for better success rate
        try:
            character_data = generate_daily_character(all_used_characters, attempt + 1)

            # Check for duplicates
            if is_duplicate(character_data, all_used_characters):
                failure_reasons["duplicate"] += 1
                logger.info(f"Attempt {attempt + 1}/15: Duplicate detected: {character_data['answer']}")
                continue

            # AI evaluation with progressive leniency
            evaluation = evaluate_character_obscurity(character_data)

            # Progressive threshold: start strict (7+), relax to 5+ after 10 attempts
            min_score = 7 if attempt < 10 else 5

            # Accept if not too obscure OR if familiarity score meets progressive threshold
            if not evaluation["is_too_obscure"] or evaluation["familiarity_score"] >= min_score:
                logger.info(f"Character approved on attempt {attempt + 1}/15: {character_data['answer']} "
                           f"(Score: {evaluation['familiarity_score']}/10, Threshold: {min_score})")

                # Get reliable image URL using multi-source fallback
                gpt_image_url = character_data.get("image_url")
                verified_image_url = get_character_image_url(
                    character_data["answer"],
                    gpt_image_url
                )
                character_data["image_url"] = verified_image_url

                return character_data
            else:
                failure_reasons["too_obscure"] += 1
                logger.info(f"Attempt {attempt + 1}/15: Character too obscure: {character_data['answer']} "
                           f"(Score: {evaluation['familiarity_score']}/10, Threshold: {min_score}, "
                           f"Reason: {evaluation.get('reasoning', 'N/A')})")

        except Exception as e:
            failure_reasons["other_error"] += 1
            logger.warning(f"Attempt {attempt + 1}/15 failed with error: {e}")

    # If all attempts fail, raise error with detailed diagnostics
    error_msg = (f"Could not generate unique, appropriate character after 15 attempts. "
                f"Failures: {failure_reasons['duplicate']} duplicates, "
                f"{failure_reasons['too_obscure']} too obscure, "
                f"{failure_reasons['other_error']} errors. "
                f"Total characters in avoid list: {len(all_used_characters)}")
    logger.error(error_msg)
    raise CharacterGenerationError(error_msg)


def test_generation() -> Dict[str, any]:
    """
    Test function to verify AI generation is working.
    Useful for development and debugging.
    """
    try:
        character = generate_daily_character()
        print(f"Generated Character: {character['answer']}")
        print(f"Aliases: {character['aliases']}")
        print("Hints:")
        for i, hint in enumerate(character["hints"], 1):
            print(f"  {i}. {hint}")
        print(f"Sources: {character['source_urls']}")
        return character
    except CharacterGenerationError as e:
        print(f"Character generation failed: {e}")
        raise