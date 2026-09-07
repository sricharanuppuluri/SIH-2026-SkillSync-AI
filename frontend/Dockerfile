# SkillSync AI — Frontend Dockerfile
# Production multi-stage build for Vite + React frontend

# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests for layer caching
COPY package.json package-lock.json* ./

# Install all dependencies including devDeps needed for build
RUN npm ci --prefer-offline

# Copy source files
COPY . .

# Build production bundle (outputs to /app/dist)
RUN npm run build

# ─── Stage 2: Serve with nginx ────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf 2>/dev/null || true

# If no nginx.conf shipped, create a sensible SPA default
RUN if [ ! -f /etc/nginx/conf.d/default.conf ]; then \
    echo 'server { \
        listen 3000; \
        root /usr/share/nginx/html; \
        index index.html; \
        location / { try_files $uri $uri/ /index.html; } \
        location /api/ { return 404; } \
        gzip on; \
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml; \
    }' > /etc/nginx/conf.d/default.conf; \
    fi

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
