# Figurdle API

FastAPI backend for the daily historical character guessing game.

## Features

- **AI Character Generation**: Uses OpenAI GPT to generate daily historical characters with hints
- **Progressive Hint System**: Reveals hints one by one as players make incorrect guesses
- **Secure Validation**: HMAC signature verification for API requests
- **Database Integration**: PostgreSQL with SQLAlchemy and Alembic migrations
- **Cloud-Ready**: Configured for Google Cloud Run deployment

## Tech Stack

- **Framework**: FastAPI with Pydantic
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Migrations**: Alembic
- **AI Integration**: OpenAI GPT-4o-mini
- **Authentication**: HMAC signature-based validation

## Local Development

### Prerequisites

- Python 3.11+
- PostgreSQL (for production setup)
- OpenAI API key

### Setup

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set environment variables:**
   ```bash
   # Create .env file
   OPENAI_API_KEY=your_openai_api_key_here
   PUZZLE_SIGNING_SECRET=your_secret_key_here
   DATABASE_URL=sqlite:///./dev.sqlite3  # For development
   ```

4. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

5. **Start development server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
   ```

## API Endpoints

### Core Endpoints

- `GET /health` - Health check
- `GET /puzzle/today` - Get today's puzzle metadata
- `POST /guess` - Submit a guess and get result
- `POST /admin/rotate` - Generate new daily puzzle (admin)

### Response Examples

**Get Today's Puzzle:**
```json
{
  "puzzle_date": "2025-01-07",
  "hints_count": 5,
  "signature": "abc123..."
}
```

**Submit Guess:**
```json
{
  "correct": false,
  "reveal_next_hint": true,
  "next_hint": "This person lived in the 16th century",
  "normalized_answer": null
}
```

## Database Schema

### Puzzles Table
- `id`: Primary key
- `puzzle_date`: Date for the puzzle (unique)
- `answer`: The correct character name
- `aliases`: List of acceptable alternative answers
- `hints`: Progressive hints array
- `source_urls`: Reference URLs for the character

## Deployment

### Google Cloud Run

1. **Build and deploy:**
   ```bash
   gcloud run deploy figurdle-api \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --dockerfile Dockerfile.cloudrun
   ```

2. **Set environment variables:**
   ```bash
   gcloud run services update figurdle-api \
     --set-env-vars ENVIRONMENT=production \
     --set-env-vars OPENAI_API_KEY=your_key \
     --set-env-vars PUZZLE_SIGNING_SECRET=your_secret
   ```

See the main [DEPLOYMENT.md](../../DEPLOYMENT.md) for complete deployment instructions.

## Development Commands

### Database Operations

```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Testing

```bash
# Test health endpoint
curl http://localhost:8080/health

# Test puzzle generation (requires OpenAI API key)
curl -X POST http://localhost:8080/admin/rotate
```

## Configuration

All configuration is handled through environment variables via Pydantic Settings:

- `DATABASE_URL`: Database connection string
- `OPENAI_API_KEY`: OpenAI API key for character generation
- `PUZZLE_SIGNING_SECRET`: Secret for HMAC signatures
- `ENVIRONMENT`: Set to 'production' for Cloud SQL
- `INSTANCE_CONNECTION_NAME`: Cloud SQL instance (production only)

## Security

- **HMAC Signatures**: All puzzle requests require valid signatures
- **CORS Configuration**: Restricts origins based on environment
- **Environment Isolation**: Separate configs for development/production
- **No Secrets in Code**: All sensitive data via environment variables