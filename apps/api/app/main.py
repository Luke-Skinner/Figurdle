from fastapi import FastAPI, HTTPException, Request, Cookie, Response, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine, SessionLocal
from .models import Puzzle, UserSession
from .schemas import PublicPuzzle, GuessIn, GuessOut
from .config import settings
from .ai import generate_daily_character_with_ai_evaluation, CharacterGenerationError, record_used_character
from datetime import datetime, date
import pytz, hmac, hashlib, json, secrets
import logging
import traceback

logger = logging.getLogger(__name__)

app = FastAPI(title="Figurdle API", version="1.0.0")

# CORS: allow development and production origins
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3003",
]

# Check for environment variable override first
if settings.ALLOWED_ORIGINS:
    # Split comma-separated origins and add to allowed_origins
    env_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
    allowed_origins.extend(env_origins)
    logger.info(f"Added {len(env_origins)} origins from ALLOWED_ORIGINS env var")
elif settings.ENVIRONMENT == "production":
    allowed_origins.extend([
        "https://figurdle.com",
        "https://www.figurdle.com",
        "https://figurdle.vercel.app",
        "https://figurdle-web.vercel.app",
        "https://figurdle-git-main.vercel.app"
    ])
    # Note: Cannot use ["*"] with credentials=True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database migrations are handled by Alembic
# Run: alembic upgrade head

def today_pst() -> date:
    return datetime.now(pytz.timezone("America/Los_Angeles")).date()

def sign(payload: dict) -> str:
    msg = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    return hmac.new(settings.PUZZLE_SIGNING_SECRET.encode(), msg, hashlib.sha256).hexdigest()

def verify_admin_key(admin_key: str = Header(None, alias="X-Admin-Key")):
    """Verify admin authentication key"""
    if not admin_key or admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid admin key")
    return admin_key

def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate Levenshtein distance between two strings"""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]

def is_fuzzy_match(guess: str, target: str, max_distance: int = None) -> bool:
    """Check if guess is close enough to target to be considered a match"""
    if guess == target:
        return True

    # Don't allow very short guesses to match long targets
    if len(guess) < 3 and len(target) > 6:
        return False

    # Be more strict with very short words to prevent false matches like "Will" vs "Bill"
    if len(guess) <= 4 and len(target) <= 4:
        # For short words, require higher similarity to prevent false matches
        max_distance = 1
        min_similarity = 0.8  # Much stricter for short words
    else:
        # Calculate adaptive threshold based on word length
        if max_distance is None:
            word_len = len(target)
            if word_len <= 4:
                max_distance = 1  # Very short names: 1 typo max
            elif word_len <= 8:
                max_distance = 2  # Medium names: 2 typos max
            else:
                max_distance = 3  # Long names: 3 typos max

        # More lenient similarity threshold for reasonable partial matches
        max_len = max(len(guess), len(target))
        min_similarity = 0.4 if max_len > 8 else 0.5

    distance = levenshtein_distance(guess, target)

    # Additional similarity check: ensure reasonable similarity
    max_len = max(len(guess), len(target))
    similarity_ratio = 1 - (distance / max_len)

    return distance <= max_distance and similarity_ratio >= min_similarity

def normalize_for_matching(text: str) -> str:
    """Normalize text for better fuzzy matching by handling common variations"""
    text = text.strip().lower()
    # Remove common punctuation that might be missed - handle possessives correctly
    text = text.replace("'s ", " ").replace("'", "").replace(".", "").replace(",", "").replace("-", " ")
    # Normalize whitespace
    text = " ".join(text.split())
    return text

def find_fuzzy_match(guess: str, possible_answers: list) -> tuple[bool, str]:
    """Find if guess matches any of the possible answers within typo tolerance"""
    guess_norm = normalize_for_matching(guess)

    for answer in possible_answers:
        answer_norm = normalize_for_matching(answer)

        # Try exact match first (after normalization)
        if guess_norm == answer_norm:
            return True, answer

        # Try fuzzy match
        if is_fuzzy_match(guess_norm, answer_norm):
            return True, answer

        # Try matching individual words for multi-word names
        guess_words = guess_norm.split()
        answer_words = answer_norm.split()

        # If both have multiple words, try matching with word order flexibility
        if len(guess_words) > 1 and len(answer_words) > 1:
            # Check if all guess words fuzzy match to some answer word
            matched_words = 0
            for guess_word in guess_words:
                for answer_word in answer_words:
                    if is_fuzzy_match(guess_word, answer_word):
                        matched_words += 1
                        break

            # Require more strict word matching: at least 2/3 of words must match for multi-word names
            # This prevents false positives while still allowing reasonable typos
            if len(guess_words) == 2:
                required_matches = 2  # Both words must match for 2-word names
            elif len(guess_words) == 3:
                required_matches = 2  # At least 2 out of 3 words must match
            else:
                required_matches = len(guess_words) * 2 // 3  # At least 2/3 for longer names

            if matched_words >= required_matches:
                return True, answer

    return False, ""

@app.get("/healthz")
def health():
    return {"ok": True}

@app.get("/health")
def health_check():
    """Health check endpoint for Cloud Run"""
    return {"status": "healthy", "environment": settings.ENVIRONMENT}

@app.get("/debug/cors")
def debug_cors():
    """Debug endpoint to check CORS configuration"""
    return {
        "environment": settings.ENVIRONMENT,
        "allowed_origins": allowed_origins,
        "total_origins": len(allowed_origins)
    }

@app.get("/admin/status")
def generation_status(admin_key: str = Depends(verify_admin_key)):
    """Check if today's puzzle exists and when it was created."""
    with SessionLocal() as db:
        p = db.query(Puzzle).filter(Puzzle.puzzle_date == today_pst()).one_or_none()
        if not p:
            return {
                "puzzle_date": str(today_pst()),
                "exists": False,
                "will_auto_generate": True
            }
        return {
            "puzzle_date": str(p.puzzle_date),
            "exists": True,
            "character": p.answer,
            "created_at": str(p.created_at),
            "hints_count": len(p.hints)
        }

@app.post("/admin/rotate")
def rotate(admin_key: str = Depends(verify_admin_key)):
    """Generate today's puzzle using AI character generation."""
    with SessionLocal() as db:
        # Check if today's puzzle already exists
        existing_puzzle = db.query(Puzzle).filter(Puzzle.puzzle_date == today_pst()).first()
        if existing_puzzle:
            logger.info(f"Puzzle already exists for {today_pst()}: {existing_puzzle.answer}")
            return {"status": "exists", "character": existing_puzzle.answer}
        
        try:
            # Generate new character using AI
            logger.info("Generating new character using AI...")
            character_data = generate_daily_character_with_ai_evaluation()
            
            # Create puzzle from AI-generated data
            new_puzzle = Puzzle(
                puzzle_date=today_pst(),
                answer=character_data["answer"],
                aliases=character_data["aliases"],
                hints=character_data["hints"],
                source_urls=character_data["source_urls"],
                image_url=character_data.get("image_url")
            )
            
            db.add(new_puzzle)
            db.commit()

            # Record character as used to prevent future duplicates
            record_used_character(character_data, today_pst())

            logger.info(f"Successfully created new puzzle: {character_data['answer']}")
            return {
                "status": "created",
                "character": character_data["answer"],
                "aliases_count": len(character_data["aliases"]),
                "hints_count": len(character_data["hints"])
            }
            
        except CharacterGenerationError as e:
            logger.error(f"AI character generation failed: {e}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to generate character: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error during puzzle creation: {e}")
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Internal server error during puzzle creation"
            )

@app.get("/puzzle/today", response_model=PublicPuzzle)
def get_puzzle_today(figurdle_session: str = Cookie(None)):
    with SessionLocal() as db:
        p = db.query(Puzzle).filter(Puzzle.puzzle_date == today_pst()).one_or_none()
        if not p:
            try:
                logger.info(f"No puzzle found for {today_pst()}, generating automatically...")
                character_data = generate_daily_character_with_ai_evaluation()

                p = Puzzle(
                    puzzle_date=today_pst(),
                    answer=character_data["answer"],
                    aliases=character_data["aliases"],
                    hints=character_data["hints"],
                    source_urls=character_data["source_urls"],
                    image_url=character_data.get("image_url")
                )

                db.add(p)
                db.commit()

                # Record character as used to prevent future duplicates
                record_used_character(character_data, today_pst())

                logger.info(f"Auto-generated puzzle: {character_data['answer']}")

            except CharacterGenerationError as e:
                logger.error(f"Auto-generation failed: {e}")
                logger.error(f"Full traceback: {traceback.format_exc()}")
                raise HTTPException(503, f"Puzzle generation failed: {str(e)}")
            except Exception as e:
                logger.error(f"Unexpected error during auto-generation: {e}")
                logger.error(f"Full traceback: {traceback.format_exc()}")
                db.rollback()
                raise HTTPException(503, "Puzzle service temporarily unavailable")

        # Check if user has a session to determine what hints to include
        revealed_hints = []
        answer = None
        if figurdle_session:
            session_record = db.query(UserSession).filter(
                UserSession.session_id == figurdle_session,
                UserSession.puzzle_date == today_pst()
            ).first()

            if session_record and session_record.hints_revealed > 0:
                # Include the hints they've already seen
                hints_count = min(session_record.hints_revealed, len(p.hints))
                revealed_hints = p.hints[:hints_count]
                logger.info(f"Returning {len(revealed_hints)} revealed hints for session {figurdle_session[:8]}...")

            # Include answer if session is completed
            if session_record and session_record.completed:
                answer = p.answer
                logger.info(f"Including answer for completed session {figurdle_session[:8]}...")

        # Create signature payload (without revealed_hints for compatibility)
        signature_payload = {
            "puzzle_date": str(p.puzzle_date),
            "hints_count": len(p.hints)
        }

        # Create response payload (with revealed_hints, answer, and image_url)
        response_payload = {
            "puzzle_date": str(p.puzzle_date),
            "hints_count": len(p.hints),
            "revealed_hints": revealed_hints,
            "answer": answer,
            "image_url": p.image_url if answer else None,  # Only include image if game is completed
            "signature": sign(signature_payload)
        }

        return response_payload

@app.post("/guess", response_model=GuessOut)
def post_guess(g: GuessIn, request: Request):
    date_str = request.query_params.get("date")
    hc = request.query_params.get("hc")
    if not date_str or not hc:
        raise HTTPException(400, "Missing query: date or hc")

    # Verify signature matches what server would sign for this context
    expected_payload = {"puzzle_date": date_str, "hints_count": int(hc)}
    expected_signature = sign(expected_payload)

    logger.info(f"Signature validation - Expected: {expected_signature[:8]}..., Received: {g.signature[:8]}...")
    logger.info(f"Expected payload: {expected_payload}")

    if g.signature != expected_signature:
        raise HTTPException(400, "Invalid signature")

    with SessionLocal() as db:
        p = db.query(Puzzle).filter(Puzzle.puzzle_date == today_pst()).one()
        norm = g.guess.strip().lower()
        answers = [p.answer] + p.aliases  # Keep original case for matching

        logger.info(f"Processing guess: '{g.guess}' (normalized: '{norm}')")
        logger.info(f"Checking against {len(answers)} possible answers")
        logger.info(f"Revealed count from frontend: {g.revealed}, Total hints available: {len(p.hints)}")

        # First try exact match (case-insensitive)
        if norm in [a.lower() for a in answers]:
            logger.info("Exact match found - returning victory response")
            return GuessOut(correct=True, reveal_next_hint=False, next_hint=None, normalized_answer=p.answer)

        # Try fuzzy matching if exact match fails (allows minor typos)
        is_match, matched_answer = find_fuzzy_match(g.guess, answers)
        if is_match:
            distance = levenshtein_distance(norm, normalize_for_matching(matched_answer))
            logger.info(f"Fuzzy match found: '{g.guess}' matches '{matched_answer}' (distance: {distance})")
            return GuessOut(correct=True, reveal_next_hint=False, next_hint=None, normalized_answer=p.answer)

        if g.revealed < len(p.hints):
            next_hint = p.hints[g.revealed]
            logger.info(f"Wrong guess, revealing hint {g.revealed + 1}/{len(p.hints)}: '{next_hint}'")
            return GuessOut(correct=False, reveal_next_hint=True, next_hint=next_hint, normalized_answer=None)

        logger.info(f"All hints exhausted ({g.revealed} >= {len(p.hints)}) - returning game over response")
        return GuessOut(correct=False, reveal_next_hint=False, next_hint=None, normalized_answer=p.answer)

@app.get("/session/status")
def get_session_status(request: Request, response: Response, figurdle_session: str = Cookie(None)):
    """Check session status and create session if needed"""
    logger.info(f"Session status called - Session: {figurdle_session[:8] if figurdle_session else 'None'}...")
    logger.info(f"Session status cookies count: {len(request.cookies)}")

    # Create session if doesn't exist
    if not figurdle_session:
        figurdle_session = secrets.token_urlsafe(32)
        is_production = settings.ENVIRONMENT == "production"
        response.set_cookie(
            "figurdle_session",
            figurdle_session,
            max_age=86400 * 30,  # 30 days
            httponly=True,
            secure=is_production,  # Secure in production, not in development
            samesite="none"
        )
        logger.info(f"Created new session: {figurdle_session[:8]}... (secure={settings.ENVIRONMENT == 'production'})")

    # Check if user has played today
    with SessionLocal() as db:
        session_record = db.query(UserSession).filter(
            UserSession.session_id == figurdle_session,
            UserSession.puzzle_date == today_pst()
        ).first()

        return {
            "session_id": figurdle_session[:8] + "...",  # Truncated for privacy
            "can_play": not session_record or not session_record.completed,
            "has_played": bool(session_record),
            "result": session_record.result if session_record else None,
            "attempts": session_record.attempts_count if session_record else 0,
            "hints_revealed": session_record.hints_revealed if session_record else 0,
            "completed_at": str(session_record.completed_at) if session_record and session_record.completed_at else None
        }

@app.post("/session/complete")
def complete_session(
    request: Request,
    figurdle_session: str = Cookie(None)
):
    """Record game completion"""
    logger.info(f"Complete session called - Session: {figurdle_session[:8] if figurdle_session else 'None'}...")
    logger.info(f"Query params: {dict(request.query_params)}")

    if not figurdle_session:
        logger.warning("No session cookie found for complete")
        raise HTTPException(400, "No session found")

    # Get parameters from query string
    result = request.query_params.get("result")
    attempts = request.query_params.get("attempts")
    hints_revealed = request.query_params.get("hints_revealed")

    if not result or not attempts or not hints_revealed:
        raise HTTPException(400, "Missing query parameters: result, attempts, hints_revealed")

    if result not in ['won', 'lost']:
        raise HTTPException(400, "Result must be 'won' or 'lost'")

    try:
        attempts = int(attempts)
        hints_revealed = int(hints_revealed)
    except ValueError:
        raise HTTPException(400, "attempts and hints_revealed must be integers")

    with SessionLocal() as db:
        session_record = db.query(UserSession).filter(
            UserSession.session_id == figurdle_session,
            UserSession.puzzle_date == today_pst()
        ).first()

        if not session_record:
            session_record = UserSession(
                session_id=figurdle_session,
                puzzle_date=today_pst(),
                completed=True,
                result=result,
                attempts_count=attempts,
                hints_revealed=hints_revealed,
                completed_at=datetime.now(pytz.timezone("America/Los_Angeles"))
            )
            db.add(session_record)
            logger.info(f"Created new session record for {figurdle_session[:8]}...: {result}")
        else:
            if session_record.completed:
                logger.warning(f"Session {figurdle_session[:8]}... already completed today")
                return {"success": False, "message": "Game already completed today"}

            session_record.completed = True
            session_record.result = result
            session_record.attempts_count = attempts
            session_record.hints_revealed = hints_revealed
            session_record.completed_at = datetime.now(pytz.timezone("America/Los_Angeles"))
            logger.info(f"Updated session record for {figurdle_session[:8]}...: {result}")

        db.commit()
        return {"success": True, "result": result}

@app.post("/session/update-progress")
def update_session_progress(
    request: Request,
    figurdle_session: str = Cookie(None)
):
    """Update session progress during gameplay"""
    logger.info(f"Update progress called - Session: {figurdle_session[:8] if figurdle_session else 'None'}...")
    logger.info(f"Query params: {dict(request.query_params)}")

    if not figurdle_session:
        logger.warning("No session cookie found for update-progress")
        raise HTTPException(400, "No session found")

    # Get parameters from query string
    attempts = request.query_params.get("attempts")
    hints_revealed = request.query_params.get("hints_revealed")

    if not attempts or not hints_revealed:
        raise HTTPException(400, "Missing query parameters: attempts, hints_revealed")

    try:
        attempts = int(attempts)
        hints_revealed = int(hints_revealed)
    except ValueError:
        raise HTTPException(400, "attempts and hints_revealed must be integers")

    with SessionLocal() as db:
        session_record = db.query(UserSession).filter(
            UserSession.session_id == figurdle_session,
            UserSession.puzzle_date == today_pst()
        ).first()

        if not session_record:
            session_record = UserSession(
                session_id=figurdle_session,
                puzzle_date=today_pst(),
                completed=False,
                attempts_count=attempts,
                hints_revealed=hints_revealed
            )
            db.add(session_record)
        else:
            if not session_record.completed:
                session_record.attempts_count = attempts
                session_record.hints_revealed = hints_revealed

        db.commit()
        return {"success": True}
