# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — GreenCO2 Frontend (multi-stage)
# ─────────────────────────────────────────────────────────────────────────────
# Stage 1  →  Build React app
# Stage 2  →  Serve the static build with nginx
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cached unless package.json changes)
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy source and build
COPY . .

# REACT_APP_API_URL="" → axios uses relative URLs → nginx proxy handles /api/*
ARG REACT_APP_API_URL=""
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build


# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Replace default nginx config with our SPA + proxy config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React assets from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
