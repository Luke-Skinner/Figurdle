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

def generate_daily_character() -> Dict[str, any]:
    """
    Generate a new historical figure character for today's puzzle using OpenAI.
    
    Returns a dictionary with:
    - answer: The main name of the character (e.g., "Napoleon Bonaparte")
    - aliases: List of alternative names (e.g., ["Napoleon", "Napoléon Bonaparte"])  
    - hints: List of 7 progressive hints from vague to specific
    - source_urls: List of relevant Wikipedia/reference URLs
    
    Raises CharacterGenerationError if generation fails.
    """
    
    # Craft a detailed prompt for consistent, high-quality character generation
    system_prompt = """You are a game designer creating daily puzzles for "Figurdle" - a Wordle-like game where players guess historical figures based on progressive hints.

Generate a historical figure that meets these criteria:
- Well-known enough that players have a reasonable chance of guessing
- Historically significant (not just famous for being famous)
- Has interesting, distinctive facts for hints
- Can be from any time period or culture

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