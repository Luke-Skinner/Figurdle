from sqlalchemy import Column, Date, Text, func
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
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
