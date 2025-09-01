# Figurdle

A daily art guessing game inspired by Wordle.

## Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd Figurdle

# Start the development environment
cd infra/docker
make dev

# Or run in background
make dev-d
```

## Project Structure

```
Figurdle/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # FastAPI backend
├── infra/
│   └── docker/       # Docker configuration and deployment
└── docs/             # Documentation
```

## Development

All Docker commands should be run from `infra/docker/`:

```bash
cd infra/docker

# Development
make dev              # Start all services
make logs            # View logs
make stop            # Stop services

# Production
make prod            # Deploy production stack
make backup          # Backup database
make health          # Check service health

# See all available commands
make help
```

## Services

- **Frontend**: Next.js app on http://localhost:3000
- **Backend**: FastAPI app on http://localhost:8080
- **Database**: PostgreSQL on localhost:5432

## Documentation

For detailed setup and deployment instructions, see the [Docker README](infra/docker/README.md).
