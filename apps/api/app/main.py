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
                source_urls=character_data["source_urls"]
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
                    source_urls=character_data["source_urls"]
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

        # Create signature payload (without revealed_hints for compatibility)
        signature_payload = {
            "puzzle_date": str(p.puzzle_date),
            "hints_count": len(p.hints)
        }

        # Create response payload (with revealed_hints)
        response_payload = {
            "puzzle_date": str(p.puzzle_date),
            "hints_count": len(p.hints),
            "revealed_hints": revealed_hints,
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
        answers = [p.answer.lower()] + [a.lower() for a in p.aliases]

        logger.info(f"Processing guess: '{g.guess}' (normalized: '{norm}')")
        logger.info(f"Checking against {len(answers)} possible answers")
        logger.info(f"Revealed count from frontend: {g.revealed}, Total hints available: {len(p.hints)}")

        if norm in answers:
            logger.info("Guess is correct - returning victory response")
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
