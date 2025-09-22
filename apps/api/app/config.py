from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./dev.sqlite3"
    OPENAI_API_KEY: str = "replace-me"
    OPENAI_MODEL: str = "gpt-4o-mini"
    PUZZLE_SIGNING_SECRET: str = "change-me"
    
    # Google Cloud specific settings
    GOOGLE_CLOUD_PROJECT: str = ""
    INSTANCE_CONNECTION_NAME: str = ""
    DB_USER: str = "figurdle-user"
    DB_PASS: str = ""
    DB_NAME: str = "figurdle"
    
    # Environment detection
    ENVIRONMENT: str = "development"
    PORT: int = 8080

    # CORS configuration override
    ALLOWED_ORIGINS: str = ""

    # Admin authentication
    ADMIN_SECRET_KEY: str = "change-me-admin-secret"

    # AI-driven duplicate prevention settings
    DUPLICATE_PREVENTION_DAYS: int = 90  # Avoid duplicates from last N days
    FALLBACK_DUPLICATE_DAYS: int = 30    # In fallback, only avoid last N days  
    OBSCURITY_THRESHOLD: int = 6         # Minimum familiarity score (1-10)
    
    class Config:
        env_file = ".env"
    
    def get_database_url(self) -> str:
        """Get database URL based on environment"""
        if self.ENVIRONMENT == "production" and self.INSTANCE_CONNECTION_NAME:
            # Cloud SQL connection for production
            db_url = f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASS}@/{self.DB_NAME}?host=/cloudsql/{self.INSTANCE_CONNECTION_NAME}"
            print(f"Using database URL: {db_url}")
            return db_url
        print(f"Using database URL: {self.DATABASE_URL}")
        return self.DATABASE_URL

settings = Settings()
