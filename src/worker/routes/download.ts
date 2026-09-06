import { verifyJWT } from "../lib/jwt"
import { verifyPassword } from "../lib/crypto"
import { checkRateLimit } from "../middleware/rateLimit"
import { Hono } from "hono"

export const downloadRoutes = new Hono<{ Bindings: any }>()

function readCookie(req: Request, name: string) {
  const cookie = req.headers.get("Cookie") || ""
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

async function isUnlocked(c: any, token: string) {
  const value = readCookie(c.req.raw as Request, `fd_unlock_${token}`)
  if (!value) return false
  try {
    const payload = await verifyJWT(value, c.env.JWT_SECRET)
    return (payload as any).purpose === "transfer_unlock" && (payload as any).token === token
  } catch { return false }
}

downloadRoutes.get("/:token/:fileId?", async (c) => {
  const token = c.req.param("token")
  const fileId = c.req.param("fileId")
  const db = c.env.DB as D1Database
  const bucket = c.env.R2 as R2Bucket
  const ip = c.req.header("cf-connecting-ip") || "unknown"

  const rl = await checkRateLimit(db, `dl:${ip}`, parseInt(c.env.RATE_LIMIT_DOWNLOADS_PER_HOUR || "100"), 3600)
  if (!rl.allowed) return c.text("Rate limited", 429)

  const transfer = await db.prepare("SELECT * FROM transfers WHERE token = ?").bind(token).first() as any
  if (!transfer) return c.text("Not found", 404)
  const now = Math.floor(Date.now() / 1000)
  if (transfer.status !== "active" || transfer.expires_at < now) return c.text("Expired", 410)
  if (transfer.max_downloads && transfer.download_count >= transfer.max_downloads) return c.text("Download limit reached", 410)

  if (transfer.password_hash && !(await isUnlocked(c, token))) return c.text("Password required", 401)

  const files = await db.prepare("SELECT * FROM transfer_files WHERE transfer_id = ? AND status='completed'").bind(transfer.id).all() as any
  if (!files.results || files.results.length === 0) return c.text("No files", 404)

  if (!fileId) {
    if (files.results.length > 1) {
      return c.json({ error: "Use individual file download for multi-file transfers", files: files.results.map((r: any) => ({ id: r.id, name: r.original_name })) }, 400)
    }
    const f = files.results[0] as any
    const obj = await bucket.get(f.r2_key)
    if (!obj) return c.text("File not found in storage", 404)
    await db.prepare("UPDATE transfers SET download_count = download_count + 1 WHERE id = ?").bind(transfer.id).run()
    await db.prepare("INSERT INTO download_events (id, transfer_id, file_id, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), transfer.id, f.id, ip, c.req.header("User-Agent") || "", now).run()
    const headers = new Headers()
    obj.writeHttpMetadata(headers)
    headers.set("Content-Disposition", `attachment; filename="${f.original_name.replace(/[\"\r\n]/g, "_")}"`)
    headers.set("Cache-Control", "no-store")
    return new Response(obj.body, { headers })
  }

  const file = await db.prepare("SELECT * FROM transfer_files WHERE id = ? AND transfer_id = ? AND status='completed'").bind(fileId, transfer.id).first() as any
  if (!file) return c.text("File not found", 404)
  const obj = await bucket.get(file.r2_key)
  if (!obj) return c.text("File not in storage", 404)
  await db.prepare("UPDATE transfers SET download_count = download_count + 1 WHERE id = ?").bind(transfer.id).run()
  await db.prepare("INSERT INTO download_events (id, transfer_id, file_id, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), transfer.id, file.id, ip, c.req.header("User-Agent") || "", now).run()
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set("Content-Disposition", `attachment; filename="${file.original_name.replace(/[\"\r\n]/g, "_")}"`)
  headers.set("Cache-Control", "no-store")
  return new Response(obj.body, { headers })
})
