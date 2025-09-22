# Figurdle

A daily historical character guessing game inspired by the -dle type games. Play now at Figurdle.com!

## Quick Start

### Local Development

**Prerequisites:**
- Python 3.11+
- Node.js 18+
- OpenAI API key

**Backend Setup:**
```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up environment variables (copy from .env.example)
cp .env.example .env
# Edit .env with your OpenAI API key

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

**Frontend Setup:**
```bash
cd apps/web
npm install

# Set up environment variables for local development
echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8080" > .env.local

# Start development server
npm run dev
```

**Generate First Puzzle:**
```bash
# With the API running, generate today's puzzle (requires admin auth)
curl -X POST -H "Content-Length: 0" -H "X-Admin-Key: your-admin-secret" http://localhost:8080/admin/rotate
```

## Project Structure

```
Figurdle/
├── apps/
│   ├── web/          # Next.js frontend (Vercel)
│   └── api/          # FastAPI backend (Cloud Run)
├── DEPLOYMENT.md     # Deployment guide
└── README.md         # This file
```


## Services

### Local Development
- **Frontend**: Next.js app on http://localhost:3000
- **Backend**: FastAPI app on http://localhost:8080
- **Database**: SQLite (development)

### Production
- **Frontend**: Vercel (https://figurdle.vercel.app)
- **Backend**: Google Cloud Run (https://figurdle-api-577822725712.us-central1.run.app)
- **Database**: Google Cloud SQL (PostgreSQL)
- **Scheduling**: Google Cloud Scheduler (daily puzzle generation at 12:01 AM PST)

## Deployment

For production deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Key Features

- **AI-Generated Characters**: Daily famous figures created with OpenAI GPT-4o-mini
- **No Character Repeats**: Complete duplicate prevention system ensures every puzzle is unique
- **Automated Daily Puzzles**: Google Cloud Scheduler automatically generates new puzzles at 12:01 AM PST
- **Progressive Hints**: Get hints one by one as you make incorrect guesses
- **Daily Play Restriction**: Cookie-based session system enforces one play per day per user
- **Dark/Light Mode**: Complete theme system with user preference persistence
- **Secure Validation**: HMAC signature verification for API integrity and admin endpoint authentication
- **Resilient Error Handling**: Fallbacks for development environment issues
- **Modern Component Architecture**: Modular React components with Tailwind CSS
- **Integrated Feedback System**: Streamlined user feedback within the hints area
- **Custom Backgrounds**: Theme-specific PNG background support
- **CI/CD Pipeline**: Automated deployment via Google Cloud Run with repository integration
