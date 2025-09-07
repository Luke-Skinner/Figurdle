from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine, SessionLocal
from .models import Puzzle
from .schemas import PublicPuzzle, GuessIn, GuessOut
from .config import settings
from .ai import generate_daily_character, CharacterGenerationError
from datetime import datetime, date
import pytz, hmac, hashlib, json
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="Figurdle API", version="1.0.0")

# CORS: allow development and production origins
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add production Vercel domain if configured
if settings.ENVIRONMENT == "production":
    # Add your Vercel domain here once deployed
    # allowed_origins.extend(["https://your-app.vercel.app"])
    # For now, allow all origins in production (update this with your actual domain)
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
            character_data = generate_daily_character()
            
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
            raise HTTPException(503, "Puzzle not ready")
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

        if norm in answers:
            return GuessOut(correct=True, reveal_next_hint=False, next_hint=None, normalized_answer=p.answer)

        if g.revealed < len(p.hints):
            return GuessOut(correct=False, reveal_next_hint=True, next_hint=p.hints[g.revealed], normalized_answer=None)

        return GuessOut(correct=False, reveal_next_hint=False, next_hint=None, normalized_answer=None)
