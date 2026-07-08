# syntax=docker/dockerfile:1
#
# Single-service deploy: builds the client (static assets) and the server
# (API), and the server serves both from one process/port — see
# server/src/index.ts's SERVE_CLIENT block. One Railway service, one URL.
# CLIENT_ORIGIN doesn't need to be set for this same-origin setup; it only
# matters if the client is ever split out to its own host again.
#
# `server/dist/index.js` (built below) is a single self-contained bundle —
# tsup inlines all first-party code, including the @interview-prep/shared
# workspace package's runtime exports (see server/tsup.config.ts's
# `noExternal` — without it this silently breaks, see RUNBOOK.md). Only
# npm-published runtime deps (express, cors, zod, openai, dotenv) remain as
# real node_modules imports, which is why the runtime stage still needs a
# `node_modules` install.

FROM node:22-alpine AS base
WORKDIR /app

# ---- build-deps: full install (incl. devDependencies) needed to compile ----
FROM base AS build-deps
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci

# ---- build: compile client/src -> client/dist, server/src -> server/dist ----
FROM base AS build
COPY --from=build-deps /app/node_modules ./node_modules
COPY --from=build-deps /app/package.json /app/package-lock.json ./
COPY shared ./shared
COPY server ./server
COPY client ./client
RUN npm run build -w client
RUN npm run build -w server

# ---- prod-deps: runtime-only install (server's deps only — the client's ----
# ---- build output is static files, it doesn't need its own node_modules) --
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
RUN npm ci --omit=dev --workspace=@interview-prep/server

# ---- runtime: minimal final image ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3001
CMD ["node", "server/dist/index.js"]
