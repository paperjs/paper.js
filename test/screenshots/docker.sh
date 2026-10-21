#!/bin/sh
# Runs the screenshot tests in Playwright's Docker image of the installed
# Playwright version, where they render the same on every machine. Arguments go
# to Vitest, e.g. `pnpm test:screenshots --update` to write new references.
# Linux has its own node_modules and pnpm store, in Docker volumes.
set -e
cd "$(dirname "$0")/../.."
version=$(node -p "require('playwright/package.json').version")
exec docker run --rm -t \
  -v "$PWD":/work \
  -v paper-screenshots-node-modules:/work/node_modules \
  -v paper-screenshots-pnpm:/root/.local/share/pnpm \
  -v paper-screenshots-corepack:/root/.cache/node/corepack \
  -w /work \
  -e HUSKY=0 \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  "mcr.microsoft.com/playwright:v$version-noble" \
  sh -c 'corepack enable &&
    pnpm install --frozen-lockfile --reporter=silent &&
    pnpm exec vitest run --project screenshots "$@"' \
  sh "$@"
