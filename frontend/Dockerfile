# Dev stage
FROM oven/bun:1.3.9-alpine AS development


WORKDIR /app
COPY ./package.json ./
COPY ./shared/package.json ./shared/
COPY ./backend/package.json ./backend/
COPY ./frontend/package.json ./frontend/quasar.config.ts ./frontend/index.html ./frontend/

RUN bun ci

COPY ./shared/. ./shared/.
COPY ./backend/. ./backend/.
COPY ./frontend/. ./frontend/.


WORKDIR /app/frontend
CMD [ "bun", "dev" ]







# Build stage
FROM oven/bun:1.3.9-alpine AS builder

ARG DASHBOARD_FRONTEND_BASE_URL
ARG DASHBOARD_FRONTEND_FULL_URL
ARG API_FULL_URL
ARG API_BASE_URL
ARG NODE_ENV

WORKDIR /app
COPY ./package.json ./
COPY ./shared/package.json ./shared/
COPY ./backend/package.json ./backend/
COPY ./frontend/package.json ./frontend/quasar.config.ts ./frontend/index.html ./frontend/

RUN bun ci

COPY ./shared/. ./shared/.
COPY ./backend/. ./backend/.
COPY ./frontend/. ./frontend/.

WORKDIR /app/frontend
RUN bun run build

# Production stage
FROM nginx:1.29.5-alpine AS production

ARG DASHBOARD_FRONTEND_BASE_URL
ARG DASHBOARD_FRONTEND_FULL_URL
ARG API_FULL_URL
ARG API_BASE_URL
ARG NODE_ENV

COPY ./frontend/nginx.conf /etc/nginx/nginx.template.conf
RUN apk add --no-cache gettext
COPY --from=builder /app/frontend/dist/spa /usr/share/nginx/html
RUN envsubst '${DASHBOARD_FRONTEND_BASE_URL}' < /etc/nginx/nginx.template.conf > /etc/nginx/nginx.conf

CMD ["nginx", "-g", "daemon off;"]