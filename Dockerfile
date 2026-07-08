# syntax=docker/dockerfile:1
#
# Builds and runs the API server only (server/) for deployment on Railway.
# The client is a separate static-hosting deploy (Vercel/Netlify) — see
# RUNBOOK.md's Deployment Notes. Set CLIENT_ORIGIN on the deployed server to
# that client's URL so CORS allows it.
#
# `server/dist/index.js` (built below) is a single self-contained bundle —
# tsup inlines all first-party code, including the @interview-prep/shared
# workspace package's runtime exports. Only npm-published runtime deps
# (express, cors, zod, openai, dotenv) remain as real node_modules imports,
# which is why the runtime stage still needs a `node_modules` install.

FROM node:22-alpine AS base
WORKDIR /app

# ---- build-deps: full install (incl. devDependencies) needed to compile ----
FROM base AS build-deps
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
RUN npm ci

# ---- build: compile server/src -> server/dist/index.js ----
FROM base AS build
COPY --from=build-deps /app/node_modules ./node_modules
COPY --from=build-deps /app/package.json /app/package-lock.json ./
COPY shared ./shared
COPY server ./server
RUN npm run build -w server

# ---- prod-deps: runtime-only install (no devDependencies, no client) ----
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

EXPOSE 3001
CMD ["node", "server/dist/index.js"]
