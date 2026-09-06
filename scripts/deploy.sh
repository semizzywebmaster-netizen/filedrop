#!/bin/bash
set -e
echo "FileDrop deploy script"
npm install
npm run build:frontend
npx wrangler d1 migrations apply filedrop-db --remote
npx wrangler deploy
npx wrangler pages deploy src/frontend/dist --project-name=filedrop
echo "Deployed"
