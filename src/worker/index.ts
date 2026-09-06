import { Hono } from "hono"
import { api } from "./routes/api"
import { handleCron } from "./routes/cron"

type Bindings = {
  DB: D1Database
  R2: R2Bucket
  R2_PREVIEW: R2Bucket
  JWT_SECRET: string
  CRON_SECRET: string
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Bindings }>()

// FileDrop uses same-origin /api requests. Static SPA assets are handled by
// Cloudflare Workers Static Assets; only /api/* is routed through this Worker.
app.route("/api", api)

app.get("/api/health", (c) => c.json({ ok: true, app: "FileDrop" }))

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(handleCron(env))
  }
}
