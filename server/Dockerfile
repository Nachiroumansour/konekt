FROM node:20-bookworm as builder

# Build Frontend
WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Setup Server
FROM node:20-bookworm

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=1

RUN apt-get update     && apt-get install -y --no-install-recommends        chromium        fonts-noto-color-emoji        ca-certificates     && rm -rf /var/lib/apt/lists/*

# Install Server Deps
COPY server/package.json ./
RUN npm install --omit=dev

# Copy Server Source
COPY server/ ./

# Copy Frontend Build from Builder Stage
COPY --from=builder /app/client/dist ./public

ENV PORT=4001
ENV CHROME_PATH=/usr/bin/chromium
EXPOSE 4001

CMD ["node", "index.js"]
