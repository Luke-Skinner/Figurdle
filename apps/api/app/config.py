from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./dev.sqlite3"
    OPENAI_API_KEY: str = "replace-me"
    OPENAI_MODEL: str = "gpt-4o-mini"
    PUZZLE_SIGNING_SECRET: str = "change-me"
    class Config:
        env_file = ".env"

settings = Settings()
