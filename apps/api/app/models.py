from sqlalchemy import Column, Date, Text, func, Boolean, Integer, UniqueConstraint
from sqlalchemy.types import TIMESTAMP
from sqlalchemy.dialects.postgresql import JSON as POSTGRESQL_JSON
from sqlalchemy.dialects.sqlite import JSON as SQLITE_JSON
from .db import Base
from uuid import uuid4
import os

# Use PostgreSQL JSON for Docker, SQLite JSON for local dev
JSONType = POSTGRESQL_JSON if os.getenv("DATABASE_URL", "").startswith("postgresql") else SQLITE_JSON

class Puzzle(Base):
    __tablename__ = "puzzles"
    id = Column(Text, primary_key=True, default=lambda: str(uuid4()))
    puzzle_date = Column(Date, unique=True, nullable=False)
    answer = Column(Text, nullable=False)
    aliases = Column(JSONType, nullable=False)      # list[str]
    hints = Column(JSONType, nullable=False)        # list[str]
    source_urls = Column(JSONType, nullable=False)  # list[str]
    image_url = Column(Text, nullable=True)         # Wikipedia or AI-sourced image
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(Text, primary_key=True, default=lambda: str(uuid4()))
    session_id = Column(Text, nullable=False, index=True)
    puzzle_date = Column(Date, nullable=False, index=True)
    completed = Column(Boolean, default=False, nullable=False)
    result = Column(Text)  # 'won' or 'lost'
    attempts_count = Column(Integer, default=0, nullable=False)
    hints_revealed = Column(Integer, default=0, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(TIMESTAMP(timezone=True))

class UsedCharacter(Base):
    __tablename__ = "used_characters"
    id = Column(Text, primary_key=True, default=lambda: str(uuid4()))
    character_name = Column(Text, nullable=False, index=True)  # Normalized name
    puzzle_date = Column(Date, nullable=False, index=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    # Add unique constraint to prevent same character from being used multiple times
    __table_args__ = (
        UniqueConstraint('character_name', name='unique_character_name'),
    )
