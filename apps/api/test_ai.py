#!/usr/bin/env python3
"""
Test script for AI character generation.
Run this to test the AI functionality before using in the main app.

Usage:
    cd apps/api
    python test_ai.py
"""

import sys
import os
# Add the app directory to Python path so we can import our modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.ai import test_generation, CharacterGenerationError
from app.config import settings

def main():
    print("Figurdle AI Character Generation Test")
    print("=" * 50)
    
    # Check if API key is configured
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "sk-REPLACE_ME":
        print("ERROR: OpenAI API key not configured!")
        print("Please set your API key in apps/api/.env:")
        print("OPENAI_API_KEY=sk-your-actual-key-here")
        print("\nTo get an API key:")
        print("1. Go to https://platform.openai.com")
        print("2. Sign up/log in")
        print("3. Go to API Keys section")
        print("4. Create a new API key")
        return
    
    print(f"OK: API key configured (ends with: ...{settings.OPENAI_API_KEY[-4:]})")
    print(f"OK: Using model: {settings.OPENAI_MODEL}")
    print()
    
    try:
        print("Generating character with AI...")
        character = test_generation()
        print("\nSUCCESS: AI generation successful!")
        
    except CharacterGenerationError as e:
        print(f"ERROR: AI generation failed: {e}")
        print("\nPossible issues:")
        print("- Invalid API key")
        print("- No API credits remaining")
        print("- OpenAI service temporarily unavailable")
        print("- Network connectivity issues")
        
    except Exception as e:
        print(f"ERROR: Unexpected error: {e}")

if __name__ == "__main__":
    main()