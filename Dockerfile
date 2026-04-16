# Development Dockerfile — used by docker-compose.yml.
# Not intended for production; see Vercel for production deployment.
#
# Build context is the repo root so that next.config.ts outputFileTracingRoot
# can resolve the parent of src/ correctly inside the container.

FROM node:20-alpine

# libc6-compat is needed for some native npm modules on Alpine
RUN apk add --no-cache libc6-compat

# The Next.js project lives in src/; all npm commands run from there.
WORKDIR /app/src

# Install dependencies first so this layer is cached as long as
# package.json / package-lock.json do not change.
COPY src/package*.json ./
RUN npm ci

# Copy remaining source after dependency install (docker-compose mounts
# ./src:/app/src at runtime, so this layer is only used for plain
# `docker build` / `docker run` without compose).
COPY src/ ./

# Copy repo-level scripts (seed orchestrator lives here).
COPY scripts/ /app/scripts/

EXPOSE 3000

# docker-compose overrides this command with the migration + seed + dev chain.
CMD ["npm", "run", "dev"]
