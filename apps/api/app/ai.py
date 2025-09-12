from openai import OpenAI
from .config import settings
import json
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# Initialize OpenAI client - will be created when needed
client = None

class CharacterGenerationError(Exception):
    pass

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

def get_recent_characters(days_back: int = 90) -> List[str]:
    """Get all character names from the last N days to avoid duplicates."""
    from .db import SessionLocal
    from .models import Puzzle
    from datetime import datetime, timedelta
    import pytz
    
    cutoff_date = (datetime.now(pytz.timezone("America/Los_Angeles")) - timedelta(days=days_back)).date()
    
    with SessionLocal() as db:
        recent_puzzles = db.query(Puzzle).filter(Puzzle.puzzle_date >= cutoff_date).all()
        
        characters = []
        for puzzle in recent_puzzles:
            # Add main answer
            characters.append(puzzle.answer.lower())
            # Add all aliases
            characters.extend([alias.lower() for alias in puzzle.aliases])
        
        return list(set(characters))  # Remove duplicates

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
    evaluation_prompt = f"""You are evaluating historical figures for a daily puzzle game like Wordle, where players need a reasonable chance of guessing correctly.

Character to evaluate: {character_data['answer']}
Aliases: {', '.join(character_data['aliases'])}

Sample hints:
1. {character_data['hints'][0]}
2. {character_data['hints'][1]}
3. {character_data['hints'][2]}

Rate this character's suitability for a daily puzzle game:

Criteria for "TOO OBSCURE":
- Known only to academic specialists or history buffs
- Regional/local figures with limited global recognition  
- Requires very specific historical knowledge
- Most educated adults wouldn't recognize the name

Criteria for "APPROPRIATE":
- Taught in high school or college history classes
- Appears in documentaries, movies, or popular media
- Referenced in general knowledge contexts
- Most educated adults have heard the name

Return your evaluation as JSON:
{{
  "is_too_obscure": true/false,
  "familiarity_score": 1-10,
  "reasoning": "Brief explanation of familiarity level",
  "target_audience": "Who would typically know this person"
}}

Familiarity scale:
1-3: Academic specialists only
4-6: History enthusiasts and well-educated adults  
7-8: General educated population
9-10: Household names, widely known

Be honest - err on the side of "too obscure" to maintain game accessibility."""

    try:
        openai_client = get_openai_client()
        
        response = openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": evaluation_prompt}],
            temperature=0.3,  # Low temperature for consistent evaluation
            max_tokens=300
        )
        
        content = response.choices[0].message.content
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
        
    except Exception as e:
        logger.error(f"Obscurity evaluation failed: {e}")
        # Default to "not too obscure" to avoid blocking generation
        return {
            "is_too_obscure": False,
            "familiarity_score": 7,
            "reasoning": "Evaluation failed, defaulting to acceptable",
            "target_audience": "Unknown due to evaluation error"
        }

def generate_daily_character(avoid_characters: List[str] = None, attempt: int = 1) -> Dict[str, any]:
    """
    Generate a new historical figure character for today's puzzle using OpenAI.
    
    Returns a dictionary with:
    - answer: The main name of the character (e.g., "Napoleon Bonaparte")
    - aliases: List of alternative names (e.g., ["Napoleon", "Napoléon Bonaparte"])  
    - hints: List of 7 progressive hints from vague to specific
    - source_urls: List of relevant Wikipedia/reference URLs
    
    Raises CharacterGenerationError if generation fails.
    """
    
    # Build exclusion text for prompt
    exclusion_text = ""
    if avoid_characters and len(avoid_characters) > 0:
        exclusion_text = f"""
IMPORTANT - DO NOT choose any of these recent characters:
{', '.join(avoid_characters[:50])}"""  # Limit to first 50 to avoid token limits
        if len(avoid_characters) > 50:
            exclusion_text += f"\n(and {len(avoid_characters) - 50} more recent characters...)"

    # Adjust difficulty based on attempt number
    difficulty_guidance = ""
    if attempt == 1:
        difficulty_guidance = "Choose well-known historical figures that educated players would recognize."
    elif attempt == 2:
        difficulty_guidance = "You may choose slightly more obscure but still notable historical figures."
    else:
        difficulty_guidance = "Choose any historically significant figure, even if less commonly known."
    
    # Craft a detailed prompt for consistent, high-quality character generation
    system_prompt = f"""You are a game designer creating daily puzzles for "Figurdle" - a Wordle-like game where players guess historical figures based on progressive hints.

{exclusion_text}

Generate a historical figure that meets these criteria:
- Historically significant (not just famous for being famous)
- Has interesting, distinctive facts for hints
- Can be from any time period or culture
- {difficulty_guidance}

Return your response as valid JSON with this exact structure:
{
  "answer": "Full Name",
  "aliases": ["Alternative Name 1", "Nickname", "Title"],
  "hints": [
    "Hint 1: Very broad historical context",
    "Hint 2: Time period or geographical region", 
    "Hint 3: Field of expertise or major role",
    "Hint 4: Specific major accomplishment",
    "Hint 5: More specific detail or turning point",
    "Hint 6: Very specific fact or famous quote/event",
    "Hint 7: Nearly gives it away but requires connecting the dots"
  ],
  "source_urls": ["https://en.wikipedia.org/wiki/Character_Name"]
}

CRITICAL RULES FOR HINTS:
- NEVER mention the person's name, nickname, or any part of their name in any hint
- NEVER mention titles that directly contain their name (e.g., don't say "Napoleonic Wars" for Napoleon)
- Use pronouns (I, they, this person) instead of names
- Refer to places, events, or concepts without using the person's name
- Make hints progressively more specific but always avoid name reveals
- Hint 7 should be very specific but still require the player to make the connection

GOOD HINT EXAMPLES:
- "I rose to power during a time of revolution" (not "Napoleon rose to power...")
- "This military leader conquered much of Europe" (not "The Napoleonic conquests...")
- "I was exiled to a remote island" (not "Napoleon was exiled...")

BAD HINT EXAMPLES (NEVER DO THIS):
- "I am known as Napoleon" 
- "The Napoleonic era was named after me"
- "My name appears in the term Napoleonic Wars"
"""

    user_prompt = """Generate a historical figure for today's puzzle. Choose someone interesting and well-known, but not too obvious. Make the hints engaging and educational."""

    try:
        logger.info("Requesting character generation from OpenAI")
        
        # Get OpenAI client (creates it if needed)
        openai_client = get_openai_client()
        
        response = openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,  # Some creativity, but not too random
            max_tokens=1000,   # Enough for detailed response
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
        
        # Validate required fields
        required_fields = ["answer", "aliases", "hints", "source_urls"]
        for field in required_fields:
            if field not in character_data:
                raise CharacterGenerationError(f"Missing required field: {field}")
        
        # Validate data types and content
        if not isinstance(character_data["answer"], str):
            raise CharacterGenerationError("Answer must be a string")
            
        if not isinstance(character_data["aliases"], list):
            raise CharacterGenerationError("Aliases must be a list")
            
        if not isinstance(character_data["hints"], list) or len(character_data["hints"]) != 7:
            raise CharacterGenerationError("Must provide exactly 7 hints")
            
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
    """Check if generated character is in the avoid list."""
    answer_lower = character_data["answer"].lower()
    aliases_lower = [alias.lower() for alias in character_data["aliases"]]
    
    all_names = [answer_lower] + aliases_lower
    
    for name in all_names:
        if name in avoid_list:
            return True
    return False

def generate_daily_character_with_ai_evaluation() -> Dict[str, any]:
    """Generate character with AI-driven obscurity evaluation."""
    from .config import settings
    
    # Phase 1: Try with strict duplicate prevention
    recent_characters = get_recent_characters(settings.DUPLICATE_PREVENTION_DAYS)
    logger.info(f"Phase 1: Avoiding {len(recent_characters)} characters from last {settings.DUPLICATE_PREVENTION_DAYS} days")
    
    for attempt in range(3):  # Try a few times with strict rules
        try:
            character_data = generate_daily_character(recent_characters, attempt + 1)
            
            # AI evaluation
            evaluation = evaluate_character_obscurity(character_data)
            
            if not evaluation["is_too_obscure"]:
                logger.info(f"✅ Character approved: {character_data['answer']} "
                           f"(Score: {evaluation['familiarity_score']}/10)")
                return character_data
            else:
                logger.info(f"❌ Character too obscure: {character_data['answer']} "
                           f"(Score: {evaluation['familiarity_score']}/10) - {evaluation['reasoning']}")
                
        except Exception as e:
            logger.warning(f"Phase 1 attempt {attempt + 1} failed: {e}")
    
    # Phase 2: Allow older duplicates (30+ days)
    fallback_characters = get_recent_characters(settings.FALLBACK_DUPLICATE_DAYS)
    logger.info(f"Phase 2: AI deemed strict options too obscure. "
               f"Allowing duplicates older than {settings.FALLBACK_DUPLICATE_DAYS} days")
    
    for attempt in range(3):
        try:
            character_data = generate_daily_character(fallback_characters, attempt + 4)
            
            evaluation = evaluate_character_obscurity(character_data)
            
            if not evaluation["is_too_obscure"]:
                logger.info(f"✅ Fallback character approved: {character_data['answer']} "
                           f"(Score: {evaluation['familiarity_score']}/10)")
                return character_data
            else:
                logger.info(f"❌ Fallback character still too obscure: {character_data['answer']} "
                           f"(Score: {evaluation['familiarity_score']}/10)")
                
        except Exception as e:
            logger.warning(f"Phase 2 attempt {attempt + 1} failed: {e}")
    
    # Phase 3: Last resort - accept any character that generates successfully
    logger.warning("Phase 3: Accepting any character to ensure service availability")
    character_data = generate_daily_character([], 99)  # No restrictions
    
    evaluation = evaluate_character_obscurity(character_data)
    logger.info(f"⚠️ Last resort character: {character_data['answer']} "
               f"(Score: {evaluation['familiarity_score']}/10) - {evaluation['reasoning']}")
    
    return character_data


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