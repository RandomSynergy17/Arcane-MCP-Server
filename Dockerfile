# syntax=docker/dockerfile:1
# Arcane MCP Server — HTTP (Streamable HTTP) transport image.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    HOME=/home/node \
    ARCANE_HTTP_HOST=0.0.0.0 \
    ARCANE_HTTP_PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY README.md CHANGELOG.md LICENSE ./
# Config/hot-reload directory (~/.arcane); pre-created so a fresh named
# volume mounted here inherits node ownership.
RUN mkdir -p /home/node/.arcane && chown node:node /home/node/.arcane
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${ARCANE_HTTP_PORT}/health" >/dev/null || exit 1
ENTRYPOINT ["node", "dist/index.js"]
CMD ["--tcp"]
