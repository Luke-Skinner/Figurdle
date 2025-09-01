.PHONY: help dev prod stop clean logs backup restore

help: ## Show this help message
	@echo "Figurdle Docker Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment
	docker-compose up --build

dev-d: ## Start development environment in background
	docker-compose up --build -d

prod: ## Deploy production environment
	@chmod +x scripts/deploy.sh
	@./scripts/deploy.sh

stop: ## Stop all services
	docker-compose down
	docker-compose -f docker-compose.prod.yml down

clean: ## Remove all containers, images, and volumes
	docker-compose down -v --rmi all
	docker-compose -f docker-compose.prod.yml down -v --rmi all

logs: ## View logs from all services
	docker-compose logs -f

logs-api: ## View API logs
	docker-compose logs -f api

logs-web: ## View web logs
	docker-compose logs -f web

logs-db: ## View database logs
	docker-compose logs -f db

backup: ## Create database backup
	@chmod +x scripts/backup-db.sh
	@./scripts/backup-db.sh

restore: ## Restore database from backup (usage: make restore BACKUP=path/to/backup.sql.gz)
	@chmod +x scripts/restore-db.sh
	@./scripts/restore-db.sh $(BACKUP)

shell-api: ## Open shell in API container
	docker-compose exec api bash

shell-db: ## Open PostgreSQL shell
	docker-compose exec db psql -U figurdle -d figurdle

health: ## Check service health
	@echo "🔍 Checking service health..."
	@curl -f http://localhost:3000 > /dev/null 2>&1 && echo "✅ Web: OK" || echo "❌ Web: FAIL"
	@curl -f http://localhost:8080/health > /dev/null 2>&1 && echo "✅ API: OK" || echo "❌ API: FAIL"
	@docker-compose exec -T db pg_isready -U figurdle > /dev/null 2>&1 && echo "✅ DB: OK" || echo "❌ DB: FAIL"
