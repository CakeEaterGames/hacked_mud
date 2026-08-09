.PHONY: help dev lint db-push

.DEFAULT_GOAL := help

COMPOSE = docker compose
COMPOSE_FILE = -f deploy/dc-dev.yml
_PROJECT_NAME = hacked_mud
PROJECT_NAME = -p ${_PROJECT_NAME}
BACKEND_SERVICE = backend  
X11_RIGHTS = export DISPLAY=":0" && xhost +local:docker

help:
	@echo 'Available commands:'
	@echo '  make dev-d       - Run project in development mode with -d'
	@echo '  make dev         - Run project in development mode'
	@echo '  make lint        - Run linter'
	@echo '  make logs        - View backend container logs'
	@echo '  make icons       - Generates favicons'

dev:
	$(X11_RIGHTS) && $(COMPOSE) $(COMPOSE_FILE) $(PROJECT_NAME) up --build

dev-d:
	$(X11_RIGHTS) && $(COMPOSE) $(COMPOSE_FILE) $(PROJECT_NAME) up --build -d

build:
	$(COMPOSE) $(COMPOSE_FILE) $(PROJECT_NAME) build --no-cache

lint:
	bun run lint:fix

logs:
	$(COMPOSE) $(COMPOSE_FILE) $(PROJECT_NAME) logs -f $(BACKEND_SERVICE)

icons:
	cd ./frontend && icongenie generate -i public/icons/original.png
