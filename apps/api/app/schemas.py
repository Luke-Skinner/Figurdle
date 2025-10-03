from pydantic import BaseModel
from typing import List, Optional

class PublicPuzzle(BaseModel):
    puzzle_date: str
    hints_count: int
    signature: str
    revealed_hints: List[str] = []
    answer: Optional[str] = None
    image_url: Optional[str] = None

class GuessIn(BaseModel):
    guess: str
    revealed: int
    signature: str
    puzzle_date: str
    hints_count: int

class GuessOut(BaseModel):
    correct: bool
    reveal_next_hint: bool
    next_hint: Optional[str]
    normalized_answer: Optional[str]
