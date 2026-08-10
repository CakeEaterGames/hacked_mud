.PHONY: help dev lint db-push docs

.DEFAULT_GOAL := help

COMPOSE = docker compose
COMPOSE_DEV_FILE = -f deploy/dc-dev.yml
COMPOSE_PROD_FILE = -f deploy/dc-prod.yml
COMPOSE_DOCS_FILE = -f deploy/dc-docs.yml
_PROJECT_NAME = hacked_mud
PROJECT_NAME = -p ${_PROJECT_NAME}
BACKEND_SERVICE = backend  
DOCS_SERVICE = vitepress  
X11_RIGHTS = export DISPLAY=":0" && xhost +local:docker

help:
	@echo ''
	@echo 'For Development:'
	@echo '  make install     - To install node_modules'
	@echo '  make dev-d       - Run project in development mode with -d'
	@echo '  make dev         - Run project in development mode'
	@echo '  make dev-logs    - View backend container logs'
	@echo '  make dev-build   - Rebuild the project in development mode'
	@echo '  make lint        - Run linter'
	@echo '  make icons       - Generates favicons'
	@echo '  make docs        - Launch a local vitepress documentation'
	@echo '  make pages       - Generates github pages'
	@echo ''
	@echo 'For Production:'
	@echo '  make prod-d      - Run project in production mode with -d'
	@echo '  make prod        - Run project in production mode'
	@echo '  make prod-logs   - View backend container logs'
	@echo '  make prod-build  - Rebuild the project in production mode'
	@echo ''
	@echo 'Also:'
	@echo '  make x11         - To enable virtual inputs'
	@echo '  make prepare     - To generate the env file'

install:
	bun install

prepare:
	chmod +x deploy/configure-env.sh && ./deploy/configure-env.sh

x11:
	$(X11_RIGHTS)

dev:
	$(COMPOSE) $(COMPOSE_DEV_FILE) $(PROJECT_NAME) up --build

dev-d:
	$(COMPOSE) $(COMPOSE_DEV_FILE) $(PROJECT_NAME) up --build -d

dev-logs:
	$(COMPOSE) $(COMPOSE_DEV_FILE) $(PROJECT_NAME) logs -f $(BACKEND_SERVICE)

dev-build:
	$(COMPOSE) $(COMPOSE_DEV_FILE) $(PROJECT_NAME) build --no-cache

lint:
	bun run lint:fix


prod:
	$(COMPOSE) $(COMPOSE_PROD_FILE) $(PROJECT_NAME) up --build

prod-d:
	$(COMPOSE) $(COMPOSE_PROD_FILE) $(PROJECT_NAME) up --build -d

prod-logs:
	$(COMPOSE) $(COMPOSE_PROD_FILE) $(PROJECT_NAME) logs -f $(BACKEND_SERVICE)

prod-build:
	$(COMPOSE) $(COMPOSE_PROD_FILE) $(PROJECT_NAME) build --no-cache

icons:
	cd ./frontend && icongenie generate -i public/icons/original.png

pages:
	$(COMPOSE) $(COMPOSE_DOCS_FILE) $(PROJECT_NAME)-docs exec $(DOCS_SERVICE) bun run build

docs:
	$(COMPOSE) $(COMPOSE_DOCS_FILE) $(PROJECT_NAME)-docs up --build -d


# he-he (: 
make hax:
	$(COMPOSE) $(COMPOSE_DEV_FILE) $(PROJECT_NAME) up --build -d