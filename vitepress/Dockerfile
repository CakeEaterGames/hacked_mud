FROM oven/bun:1.3.9-alpine AS development

WORKDIR /app
COPY ./package.json ./

COPY ./vitepress/package.json ./vitepress/

RUN bun install --filter=vitepress --frozen-lockfile

COPY ./vitepress/. ./vitepress/

WORKDIR /app/vitepress
CMD [ "bun", "dev" ]



FROM oven/bun:1.3.9-alpine AS builder

WORKDIR /app
COPY ./package.json ./

COPY ./vitepress/package.json ./vitepress/

RUN bun install --filter=vitepress --frozen-lockfile

COPY ./vitepress/. ./vitepress/

WORKDIR /app/vitepress
RUN bun run build

FROM nginx:alpine AS production
COPY --from=builder /app/vitepress/.vitepress/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]