import { Hono } from "hono"
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

// FileDrop uses same-origin /api requests, so no permissive cross-origin
// credentialed CORS policy is needed. This avoids allowing arbitrary origins.
app.route("/api", api)

app.get("/api/health", (c) => c.json({ ok: true, app: "FileDrop" }))

// Serve frontend SPA - in Pages, assets are handled by Pages, but for Worker standalone:
app.get("*", async (c) => {
  return c.text("FileDrop frontend served via Cloudflare Pages. API at /api/*", 200)
})

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    ctx.waitUntil(handleCron(env))
  }
}
