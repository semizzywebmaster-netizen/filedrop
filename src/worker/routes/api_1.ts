import { Hono } from "hono"
import { authRoutes } from "./auth"
import { transferRoutes } from "./transfers"
import { uploadRoutes } from "./upload"
import { downloadRoutes } from "./download"
import { cronRoutes } from "./cron"
import { adminRoutes } from "./admin"

export const api = new Hono<{ Bindings: any }>()

api.route("/auth", authRoutes)
api.route("/transfers", transferRoutes)
api.route("/upload", uploadRoutes)
api.route("/download", downloadRoutes)
api.route("/cron", cronRoutes)
api.route("/admin", adminRoutes)

api.get("/health", (c) => c.json({ ok: true, service: "filedrop", version: "1.1.0", env: c.env.ENVIRONMENT || "dev", time: Date.now() }))

api.get("/stats", async (c) => {
  const db = c.env.DB as D1Database
  const total = await db.prepare("SELECT COUNT(*) as c FROM transfers WHERE status='active'").first() as any
  const dl = await db.prepare("SELECT COUNT(*) as c FROM download_events").first() as any
  return c.json({ activeTransfers: total?.c||0, totalDownloads: dl?.c||0 })
})
