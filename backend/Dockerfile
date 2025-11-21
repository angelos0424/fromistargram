# syntax=docker/dockerfile:1.7
FROM node:20-alpine
RUN apk add --no-cache python3 py3-pip
RUN pip3 install --no-cache-dir instaloader

WORKDIR /workspace
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend ./backend

RUN pnpm install --filter @fromistargram/backend... --frozen-lockfile
RUN pnpm --filter @fromistargram/backend run generate
RUN pnpm --filter @fromistargram/backend build

WORKDIR /workspace/backend
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
