# Stage 1: Build the Vite app
FROM node:18-alpine AS builder

WORKDIR /app

COPY ./app/package.json ./app/package-lock.json ./
RUN npm install

COPY ./app /app
RUN npm run build

# Stage 2: Serve
FROM node:18-alpine

WORKDIR /app

RUN npm install -g http-server

COPY --from=builder /app/dist /app/dist

EXPOSE 8080

CMD ["http-server", "dist", "-p", "8080"]