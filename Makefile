.PHONY: help dev lint db-push

.DEFAULT_GOAL := help

COMPOSE = docker compose
COMPOSE_FILE = -f deploy/dc-dev.yml
_PROJECT_NAME = sample
PROJECT_NAME = -p ${_PROJECT_NAME}
BACKEND_SERVICE = $(_PROJECT_NAME)-backend  

help:
	@echo 'Доступные команды:'
	@echo '  make dev-d    - Запустить проект в режиме разработки с -d'
	@echo '  make dev      - Запустить проект в режиме разработки'
	@echo '  make lint     - Запустить линтер'
	@echo '  make pg-push  - Обновить схему БД'

dev:
	$(COMPOSE) $(COMPOSE_FILE) $(PROJECT_NAME) up --build

dev-d:
	$(COMPOSE) $(COMPOSE_FILE) $(PROJECT_NAME) up --build -d

build:
	$(COMPOSE) $(COMPOSE_FILE) $(PROJECT_NAME) build --no-cache

lint:
	bun run lint:fix

db-push:
	$(COMPOSE) $(COMPOSE_FILE) $(PROJECT_NAME) exec $(BACKEND_SERVICE) bun run pg-push
 