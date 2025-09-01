# Docker & Deploy Files

## Quick Start

```bash
# Development
make dev

# Production deployment
make prod

# View all commands
make help
```

## Development Setup

To run the full Figurdle application stack:

```bash
# From project root
cd infra/docker
docker-compose up --build

# Or run in background
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Production Deployment

1. **Setup environment variables:**
   ```bash
   cp .env.example .env.prod
   # Edit .env.prod with production values
   ```

2. **Deploy:**
   ```bash
   make prod
   # Or manually:
   ./scripts/deploy.sh
   ```

3. **Check health:**
   ```bash
   make health
   ```

## Services

### Development Stack
- **web**: Next.js frontend (port 3000)
- **api**: FastAPI backend (port 8080)
- **db**: PostgreSQL database (port 5432)

### Production Stack
- **web**: Next.js frontend (internal)
- **api**: FastAPI backend (internal)
- **db**: PostgreSQL database (internal)
- **nginx**: Reverse proxy (ports 80/443)

## Database Management

### Backup
```bash
make backup
# Creates timestamped backup in ./backups/
```

### Restore
```bash
make restore BACKUP=./backups/figurdle_backup_20241201_120000.sql.gz
```

### Access Database
```bash
make shell-db
# Opens PostgreSQL shell
```

## Monitoring & Debugging

### View Logs
```bash
make logs          # All services
make logs-api       # API only
make logs-web       # Web only
make logs-db        # Database only
```

### Service Health
```bash
make health         # Check all services
```

### Shell Access
```bash
make shell-api      # API container shell
make shell-db       # Database shell
```

## Configuration

### Environment Variables

Create `.env.prod` from `.env.example` and configure:

- **Database**: PostgreSQL connection details
- **API**: Backend service configuration
- **Security**: JWT secrets, encryption keys
- **External**: Third-party API keys (future use)

### SSL Configuration

For HTTPS in production:

1. Place SSL certificates in `./ssl/`
2. Update `nginx.conf` with SSL configuration
3. Modify `docker-compose.prod.yml` to expose port 443

### Scaling

To scale services in production:

```bash
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in docker-compose files
2. **Database connection**: Check DATABASE_URL format
3. **Memory issues**: Increase Docker memory allocation
4. **Permission errors**: Check file ownership and Docker user permissions

### Reset Everything
```bash
make clean          # Removes all containers, images, and volumes
```

### View Container Status
```bash
docker-compose ps   # Development
docker-compose -f docker-compose.prod.yml ps  # Production
```
