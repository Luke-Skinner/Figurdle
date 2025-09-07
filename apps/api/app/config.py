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
    
    class Config:
        env_file = ".env"
    
    def get_database_url(self) -> str:
        """Get database URL based on environment"""
        if self.ENVIRONMENT == "production" and self.INSTANCE_CONNECTION_NAME:
            # Cloud SQL connection for production
            return f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASS}@/{self.DB_NAME}?host=/cloudsql/{self.INSTANCE_CONNECTION_NAME}"
        return self.DATABASE_URL

settings = Settings()
