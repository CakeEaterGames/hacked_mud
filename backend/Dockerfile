FROM oven/bun:latest AS development
# FROM oven/bun:1.3.9-alpine AS development

RUN apt-get update && apt-get install -y xdotool wmctrl x11-utils procps

WORKDIR /app
COPY ./package.json ./

COPY ./shared/package.json ./shared/
COPY ./backend/package.json ./backend/

RUN bun install --filter=backend --filter=shared --frozen-lockfile

COPY ./shared/. ./shared/.
COPY ./backend/. ./backend/.

WORKDIR /app/backend
CMD [ "bun", "dev" ]

