from fastapi import FastAPI, HTTPException, Request, Cookie, Response
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine, SessionLocal
from .models import Puzzle, UserSession
from .schemas import PublicPuzzle, GuessIn, GuessOut
from .config import settings
from .ai import generate_daily_character_with_ai_evaluation, CharacterGenerationError
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

#Vercel Domain
if settings.ENVIRONMENT == "production":
    allowed_origins.extend([
        "https://figurdle.vercel.app",
        "https://figurdle-web.vercel.app", 
        "https://figurdle-git-main.vercel.app"
    ])
    # Temporary: allow all origins to debug CORS
    allowed_origins = ["*"]

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

@app.get("/healthz")
def health():
    return {"ok": True}

@app.get("/health")
def health_check():
    """Health check endpoint for Cloud Run"""
    return {"status": "healthy", "environment": settings.ENVIRONMENT}

@app.get("/admin/status")
def generation_status():
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
def rotate():
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
def get_puzzle_today():
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
            
        payload = {"puzzle_date": str(p.puzzle_date), "hints_count": len(p.hints)}
        return {**payload, "signature": sign(payload)}

@app.post("/guess", response_model=GuessOut)
def post_guess(g: GuessIn, request: Request):
    date_str = request.query_params.get("date")
    hc = request.query_params.get("hc")
    if not date_str or not hc:
        raise HTTPException(400, "Missing query: date or hc")

    # Verify signature matches what server would sign for this context
    if g.signature != sign({"puzzle_date": date_str, "hints_count": int(hc)}):
        raise HTTPException(400, "Invalid signature")

    with SessionLocal() as db:
        p = db.query(Puzzle).filter(Puzzle.puzzle_date == today_pst()).one()
        norm = g.guess.strip().lower()
        answers = [p.answer.lower()] + [a.lower() for a in p.aliases]

        logger.info(f"Processing guess: '{g.guess}' (normalized: '{norm}')")
        logger.info(f"Answer: '{p.answer}', Aliases: {p.aliases}")
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
def get_session_status(response: Response, figurdle_session: str = Cookie(None)):
    """Check session status and create session if needed"""

    # Create session if doesn't exist
    if not figurdle_session:
        figurdle_session = secrets.token_urlsafe(32)
        response.set_cookie(
            "figurdle_session",
            figurdle_session,
            max_age=86400 * 30,  # 30 days
            httponly=True,
            secure=settings.ENVIRONMENT == "production",
            samesite="lax"
        )
        logger.info(f"Created new session: {figurdle_session[:8]}...")

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
    result: str,  # 'won' or 'lost'
    attempts: int,
    hints_revealed: int,
    figurdle_session: str = Cookie(None)
):
    """Record game completion"""
    if not figurdle_session:
        raise HTTPException(400, "No session found")

    if result not in ['won', 'lost']:
        raise HTTPException(400, "Result must be 'won' or 'lost'")

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
    attempts: int,
    hints_revealed: int,
    figurdle_session: str = Cookie(None)
):
    """Update session progress during gameplay"""
    if not figurdle_session:
        raise HTTPException(400, "No session found")

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
