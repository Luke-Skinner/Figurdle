# Figurdle API

FastAPI backend for the daily historical character guessing game.

## Features

- **AI Character Generation**: Uses OpenAI GPT-4o-mini to generate daily famous figures with hints
- **Complete No-Repeats System**: UsedCharacter model ensures no duplicate puzzles ever
- **Daily Play Restriction**: Cookie-based session management enforces one play per day per user
- **Automated Daily Puzzles**: Google Cloud Scheduler automatically generates new puzzles at 12:01 AM PST
- **Progressive Hint System**: 5 hints maximum revealed as players make incorrect guesses (reduced difficulty)
- **Advanced Fuzzy Matching**: Typo tolerance using Levenshtein distance algorithm for answer validation
- **Answer Persistence**: Game completion state and answers persist across browser sessions
- **Session Management**: Comprehensive user session tracking with progress persistence
- **Secure Validation**: HMAC signature verification for API requests
- **Resilient Error Handling**: Graceful fallbacks for development environment issues
- **Database Integration**: PostgreSQL with SQLAlchemy and Alembic migrations
- **Cloud-Ready**: Configured for Google Cloud Run with CI/CD pipeline support

## Tech Stack

- **Framework**: FastAPI with Pydantic
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Migrations**: Alembic
- **AI Integration**: OpenAI GPT-4o-mini
- **Authentication**: HMAC signature-based validation

## Local Development

### Prerequisites

- Python 3.11+ (3.13 supported)
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
   ADMIN_SECRET_KEY=your_admin_secret_here
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

### Session Endpoints

- `GET /session/status` - Get current session status and play eligibility
- `POST /session/complete` - Mark session as completed (won/lost)
- `POST /session/update-progress` - Update session progress (attempts/hints)

### Admin Endpoints (Requires X-Admin-Key header)

- `GET /admin/status` - Check if today's puzzle exists and view creation details
- `POST /admin/rotate` - Generate new daily puzzle (manual trigger)

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

**Check Puzzle Status:**
```json
{
  "puzzle_date": "2025-09-14",
  "exists": true,
  "character": "Leonardo da Vinci",
  "created_at": "2025-09-14T08:09:00Z",
  "hints_count": 5
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

### UsedCharacter Table
- `id`: Primary key
- `character_name`: Character name (unique constraint)
- `puzzle_date`: Date when character was used
- `created_at`: Timestamp of record creation

### UserSession Table
- `session_id`: Primary key (UUID)
- `can_play`: Whether user can still play today
- `has_played`: Whether user has played today
- `result`: Final result (won/lost/null)
- `attempts`: Number of guesses made
- `hints_revealed`: Number of hints revealed
- `completed_at`: Timestamp when session completed

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

# Test puzzle generation (requires admin authentication)
curl -X POST -H "Content-Length: 0" -H "X-Admin-Key: your-admin-secret" http://localhost:8080/admin/rotate
```

## Configuration

All configuration is handled through environment variables via Pydantic Settings:

- `DATABASE_URL`: Database connection string
- `OPENAI_API_KEY`: OpenAI API key for character generation
- `PUZZLE_SIGNING_SECRET`: Secret for HMAC signatures
- `ADMIN_SECRET_KEY`: Secret for admin endpoint authentication
- `ENVIRONMENT`: Set to 'production' for Cloud SQL
- `INSTANCE_CONNECTION_NAME`: Cloud SQL instance (production only)
- `ALLOWED_ORIGINS`: Additional CORS origins (optional)

## Security

- **Admin Authentication**: Protected admin endpoints with X-Admin-Key header validation
- **HMAC Signatures**: All puzzle requests require valid signatures
- **CORS Configuration**: Restricts origins based on environment
- **Environment Isolation**: Separate configs for development/production
- **No Secrets in Code**: All sensitive data via environment variables