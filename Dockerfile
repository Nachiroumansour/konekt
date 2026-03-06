# Stage 1: Build Frontend
FROM node:20-slim AS builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production
FROM node:20-slim

# Install Chromium for whatsapp-web.js (Puppeteer)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       chromium \
       fonts-noto-color-emoji \
       ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV CHROME_PATH=/usr/bin/chromium

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy server source
COPY server/ ./

# Copy frontend build
COPY --from=builder /app/client/dist ./public

ENV PORT=4001
EXPOSE 4001

CMD ["sh", "-c", "mkdir -p .wwebjs_auth && node cleanup.js && node index.js"]
