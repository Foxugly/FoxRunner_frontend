# Multi-stage build: Angular 21 + PrimeNG 21 → static files served by nginx.

FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first to leverage layer caching.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source, generate the OpenAPI client from the committed openapi.json
# (schema.ts is generated, not committed), then build.
COPY . .
RUN npm run gen:api:offline
RUN npm run build -- --configuration production

FROM nginx:1.27-alpine AS runtime

# Runtime config: SPA fallback + long cache on hashed assets.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Angular 21 output lives under dist/<project>/browser.
COPY --from=build /app/dist/fox-runner/browser /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
