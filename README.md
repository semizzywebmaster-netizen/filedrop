# FileDrop — Professional Cloud File Transfer Platform

> Upload your files. Get a link. Share it anywhere.

Cloudflare-first, serverless, zero-VPS file transfer platform built for production.

## Architecture

- **Frontend**: React + Vite + Tailwind → Cloudflare Pages
- **Backend**: Hono → Cloudflare Workers
- **Storage**: Cloudflare R2 (temporary, expiring)
- **Database**: Cloudflare D1 (SQLite at edge)
- **Security**: Turnstile, secure random tokens, bcrypt, JWT httpOnly
- **Cleanup**: Cron Triggers every 6h

```
Upload → Temporary R2 → Secure Link → Share → Download → Expire/Delete
```

## Quick Start

```bash
npm install
cp .env.example .dev.vars
wrangler d1 create filedrop-db
# Update database_id in wrangler.toml
npm run db:migrate
npm run dev
```

Frontend dev: `npm run dev:frontend`

## Deploy

```bash
npm run build
wrangler deploy
wrangler pages deploy src/frontend/dist
```

## Security Principles

- Files are NOT permanent assets; R2 objects auto-expire
- No sequential IDs as public tokens → crypto.randomBytes + nanoid
- No R2 credentials exposed
- Password hashing: bcryptjs
- Rate limiting via D1 counters + Workers KV logic
- Turnstile on upload + auth
- All files streamed, not buffered through Worker memory

## Phases Completed

01 Project Init, 02 Design System, 03 Public Website, 04 App Shell, 05 CF Config,
06 D1 Foundation, 07 Auth, 08 Verification, 09 Profile, 10 Guest Upload,
11 Upload Interface, 12 Chunked/Resumable, 13 R2 Integration, 14 Transfer Creation,
15 Secure Links, 16 Dashboard, 17 Download Page, 18 Streaming Download, 19 Expiry Limits,
20 Cron Cleanup, 21 Turnstile Security, 22 Rate Limit, 23 Email, 24 Transfer Settings,
25 Password Protection, 26 Share via Email, 27 Analytics, 28 History, 29 Admin,
30 System Settings, 31-33 API, 34-60 Hardening & Launch

See /docs for detailed architecture.
