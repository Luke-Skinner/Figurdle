from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine, SessionLocal
from .models import Puzzle
from .schemas import PublicPuzzle, GuessIn, GuessOut
from .config import settings
from datetime import datetime, date
import pytz, hmac, hashlib, json

app = FastAPI(title="Figurdle API", version="1.0.0")

# CORS: allow your Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dev convenience (for SQLite). We'll switch to Alembic later.
Base.metadata.create_all(bind=engine)

def today_pst() -> date:
    return datetime.now(pytz.timezone("America/Los_Angeles")).date()

def sign(payload: dict) -> str:
    msg = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    return hmac.new(settings.PUZZLE_SIGNING_SECRET.encode(), msg, hashlib.sha256).hexdigest()

@app.get("/healthz")
def health():
    return {"ok": True}

@app.post("/admin/rotate")
def rotate():
    """Dev-only stub: seeds today's puzzle."""
    with SessionLocal() as db:
        if db.query(Puzzle).filter(Puzzle.puzzle_date == today_pst()).first():
            return {"status": "exists"}
        demo = Puzzle(
            puzzle_date=today_pst(),
            answer="Napoleon Bonaparte",
            aliases=["Napoleon", "Napoléon Bonaparte"],
            hints=[
                "I rose to prominence during turbulent times in Europe.",
                "My career began in the military.",
                "I became a leader of my nation after a revolution.",
                "I crowned myself ruler and expanded my empire across Europe.",
                "A disastrous campaign in Russia marked my decline.",
                "I was exiled twice; the second time to an island in the South Atlantic.",
                "I was finally defeated at Waterloo."
            ],
            source_urls=["https://en.wikipedia.org/wiki/Napoleon"]
        )
        db.add(demo)
        db.commit()
        return {"status": "created"}

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
