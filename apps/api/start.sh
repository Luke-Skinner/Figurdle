#!/bin/bash
set -e

echo "Environment: $ENVIRONMENT"
echo "Instance connection name: $INSTANCE_CONNECTION_NAME"
echo "Database user: $DB_USER"

echo "Running database migrations..."
alembic upgrade head

echo "Creating tables if they don't exist..."
python -c "
from app.db import engine, Base
from app.models import Puzzle
print('Creating all tables...')
Base.metadata.create_all(bind=engine)
print('Tables created successfully!')
"

echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}