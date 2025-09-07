from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

# Use the environment-appropriate database URL
database_url = settings.get_database_url()

# Add connection pooling and Cloud SQL specific settings for production
engine_kwargs = {"future": True}
if settings.ENVIRONMENT == "production":
    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 2,
        "pool_pre_ping": True,
        "pool_recycle": 300,
    })

engine = create_engine(database_url, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()
