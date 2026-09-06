import { Hono } from "hono"
import { cors } from "hono/cors"
import { api } from "./routes/api"
import { handleCron } from "./routes/cron"

type Bindings = {
  DB: D1Database
  R2: R2Bucket
  R2_PREVIEW: R2Bucket
  JWT_SECRET: string
  TURNSTILE_SECRET_KEY: string
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use("*", cors({
  origin: (origin) => origin || "*",
  allowMethods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowHeaders: ["Content-Type","Authorization"],
  credentials: true
}))

// API routes
app.route("/api", api)

// Health root
app.get("/api/health", (c) => c.json({ ok: true, app: "FileDrop" }))

// Serve frontend SPA - in Pages, assets are handled by Pages, but for Worker standalone:
app.get("*", async (c) => {
  // If R2_PREVIEW has index.html or fallback, else return placeholder
  // For Pages deployment, this handler is bypassed by assets binding
  return c.text("FileDrop frontend served via Cloudflare Pages. API at /api/*", 200)
})

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    ctx.waitUntil(handleCron(env))
  }
}
