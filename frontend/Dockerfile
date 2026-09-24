# Сборка фронта в режиме live с API на том же домене (/api/v1) и раздача через Caddy.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_TILES=openfreemap
ENV VITE_API_MODE=live VITE_API_URL=/api/v1 VITE_TILES=${VITE_TILES}
RUN npx vite build

FROM caddy:2-alpine
COPY deploy/Caddyfile.docker /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80 443
