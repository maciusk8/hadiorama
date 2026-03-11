# --- Stage 1: Build the frontend ---
FROM oven/bun:1 AS builder

WORKDIR /app
WORKDIR /app

# Copy dependency files first for better caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the Vite frontend
RUN bun run build

# --- Stage 2: Production image ---
FROM oven/bun:1-slim

WORKDIR /app

# Copy dependency files and install production deps only
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy the built frontend
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server ./server

# Create data directory for persistence
RUN mkdir -p data
# Create uploads directory inside data
RUN mkdir -p data/uploads

# Initialize the database (this will create it in data/ if it doesn't exist)
RUN bun run server/init-db.ts

EXPOSE 3000

CMD ["bun", "run", "server/index.ts"]
