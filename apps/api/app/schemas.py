from pydantic import BaseModel

class PublicPuzzle(BaseModel):
    puzzle_date: str
    hints_count: int
    signature: str

class GuessIn(BaseModel):
    guess: str
    revealed: int
    signature: str
    puzzle_date: str
    hints_count: int

class GuessOut(BaseModel):
    correct: bool
    reveal_next_hint: bool
    next_hint: str | None
    normalized_answer: str | None
