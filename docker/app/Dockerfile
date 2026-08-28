# Stage 1: Build the Vite app
FROM node:24-alpine AS builder

WORKDIR /app

COPY ./app/package.json ./app/package-lock.json ./app/.npmrc ./
RUN npm install --global npm@12 \
    && echo "Node: $(node --version)" \
    && echo "npm:  $(npm --version)" \
    && test "$(node --version | cut -d. -f1 | tr -d v)" = "24" \
    && test "$(npm --version | cut -d. -f1)" = "12" \
    && npm ci

COPY ./app /app
RUN npm run build

# Stage 2: Serve
FROM node:24-alpine

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY ./docker/app/server.js /app/server.js

EXPOSE 8080

CMD ["node", "server.js"]
