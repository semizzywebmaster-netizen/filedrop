import { Hono } from "hono"
import { authRoutes } from "./auth"
import { transferRoutes } from "./transfers"
import { uploadRoutes } from "./upload"
import { downloadRoutes } from "./download"
import { cronRoutes } from "./cron"

export const api = new Hono<{ Bindings: any }>()

api.route("/auth", authRoutes)
api.route("/transfers", transferRoutes)
api.route("/upload", uploadRoutes)
api.route("/download", downloadRoutes)
api.route("/cron", cronRoutes)

api.get("/health", (c) => c.json({ ok: true, service: "filedrop", version: "1.0.0", env: c.env.ENVIRONMENT || "dev", time: Date.now() }))
