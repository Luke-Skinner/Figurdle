-- Initialize Figurdle database

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean recreation)
DROP TABLE IF EXISTS guesses;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS puzzles;

-- Puzzles table (matching the API models.py structure)
CREATE TABLE puzzles (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    puzzle_date DATE UNIQUE NOT NULL,
    answer TEXT NOT NULL,
    aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
    hints JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster date lookups
CREATE INDEX idx_puzzles_date ON puzzles(puzzle_date);

-- User sessions table (for future user tracking)
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Guesses table (for analytics and user progress)
CREATE TABLE guesses (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    session_id VARCHAR(255),
    puzzle_date DATE NOT NULL,
    guess_text VARCHAR(255) NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    hints_revealed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES user_sessions(session_id) ON DELETE SET NULL
);

-- Index for analytics queries
CREATE INDEX idx_guesses_puzzle_date ON guesses(puzzle_date);
CREATE INDEX idx_guesses_session ON guesses(session_id);

-- Sample puzzle for testing (matching API model structure)
INSERT INTO puzzles (
    puzzle_date,
    answer,
    aliases,
    hints,
    source_urls
) VALUES (
    CURRENT_DATE,
    'The Starry Night',
    '["starry night", "van gogh starry night", "vincent van gogh starry night", "the starry night"]'::jsonb,
    '[
        "This painting depicts a night sky filled with swirling clouds and blazing stars.",
        "Created in 1889, this masterpiece shows a view from an asylum window.",
        "The artist painted this while staying at Saint-Paul-de-Mausole asylum.",
        "A tall, dark cypress tree dominates the left side of the composition.",
        "The painting features a sleeping village beneath the dramatic sky.",
        "This work is considered one of the most recognizable paintings in the world."
    ]'::jsonb,
    '["https://en.wikipedia.org/wiki/The_Starry_Night", "https://www.moma.org/collection/works/79802"]'::jsonb
);
