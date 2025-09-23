# Build stage
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Install native build deps required by better-sqlite3 and other native modules for build
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    g++ \
    make \
    libsqlite3-dev \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy package manifests and install dependencies
COPY package*.json ./
# Install dependencies including devDependencies (TypeScript is required for next.config.ts)
RUN npm install --include=dev --legacy-peer-deps

# Copy source and build
COPY . .
 
# For local/dev convenience: copy the local .env into the builder and source it
# before running the Next build so all NEXT_PUBLIC_* vars are available at build time.
# WARNING: this bakes the .env into the image layers (do not use this pattern for
# publishing images that contain secrets). Use build-args or build-time secret
# managers in production instead.
# Do NOT copy .env into the image. Use build-time args passed via docker compose.
# Accept build-time args so NEXT_PUBLIC_* values are available during build without baking .env
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_DISCORD_CLIENT_ID

# Export them as environment variables in the builder stage so Next.js sees them during build
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}
ENV NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}
ENV NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_DISCORD_CLIENT_ID=${NEXT_PUBLIC_DISCORD_CLIENT_ID}

# Build the app
RUN npm run build

# Runtime stage
FROM node:20-bullseye-slim AS runner
WORKDIR /app

# Install runtime deps (only prod deps)
COPY package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy built Next app from builder
COPY --from=builder /app/.next .next
COPY --from=builder /app/package.json ./package.json
# Copy static public assets into the runtime image so Next can serve them
COPY --from=builder /app/public ./public
# next.config.ts is used at build-time; no runtime next.config.js to copy

# Expose the port your app will run on
EXPOSE 5235

# Start the app in production mode (bind to 0.0.0.0)
CMD [ "npm", "run", "start"]