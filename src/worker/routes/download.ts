import { Hono } from "hono"
import { verifyPassword } from "../lib/crypto"
import { checkRateLimit } from "../middleware/rateLimit"

export const downloadRoutes = new Hono<{ Bindings: any }>()

downloadRoutes.get("/:token/:fileId?", async (c) => {
  const token = c.req.param("token")
  const fileId = c.req.param("fileId")
  const password = c.req.query("p")
  const db = c.env.DB as D1Database
  const bucket = c.env.R2 as R2Bucket
  const ip = c.req.header("cf-connecting-ip") || "unknown"

  const rl = await checkRateLimit(db, `dl:${ip}`, 100, 3600)
  if (!rl.allowed) return c.text("Rate limited", 429)

  const transfer = await db.prepare("SELECT * FROM transfers WHERE token = ?").bind(token).first() as any
  if (!transfer) return c.text("Not found", 404)
  const now = Math.floor(Date.now()/1000)
  if (transfer.status !== "active" || transfer.expires_at < now) return c.text("Expired", 410)
  if (transfer.max_downloads && transfer.download_count >= transfer.max_downloads) return c.text("Download limit reached", 410)
  if (transfer.password_hash) {
    if (!password) return c.text("Password required", 401)
    const ok = await verifyPassword(password, transfer.password_hash)
    if (!ok) return c.text("Invalid password", 401)
  }

  if (!fileId) {
    // Download all as zip? For MVP, if single file, stream it; if multiple, first file or zip logic (simplify to first)
    const files = await db.prepare("SELECT * FROM transfer_files WHERE transfer_id = ? AND status='completed'").bind(transfer.id).all() as any
    if (!files.results || files.results.length===0) return c.text("No files", 404)
    if (files.results.length===1) {
      const f = files.results[0] as any
      const obj = await bucket.get(f.r2_key)
      if (!obj) return c.text("File not found in storage", 404)
      await db.prepare("UPDATE transfers SET download_count = download_count + 1 WHERE id = ?").bind(transfer.id).run()
      await db.prepare("INSERT INTO download_events (id, transfer_id, file_id, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), transfer.id, f.id, ip, c.req.header("User-Agent")||"", now).run()
      const headers = new Headers()
      obj.writeHttpMetadata(headers)
      headers.set("Content-Disposition", `attachment; filename="${f.original_name}"`)
      return new Response(obj.body, { headers })
    } else {
      // For multi-file, create a simple concatenated zip would require library; for MVP return json list instructing frontend to download individually
      // But we implement streaming zip via simple approach: return first file with warning? Instead return 400 with list
      // Better: implement basic zip creation using manual? For simplicity, we stream as zip placeholder - we'll just download all via client loop, so return error with files list
      return c.json({ error: "Use individual file download for multi-file transfers", files: files.results.map((r:any)=>({ id: r.id, name: r.original_name })) }, 400)
    }
  } else {
    const file = await db.prepare("SELECT * FROM transfer_files WHERE id = ? AND transfer_id = ?").bind(fileId, transfer.id).first() as any
    if (!file) return c.text("File not found", 404)
    const obj = await bucket.get(file.r2_key)
    if (!obj) return c.text("File not in storage", 404)
    await db.prepare("UPDATE transfers SET download_count = download_count + 1 WHERE id = ?").bind(transfer.id).run()
    await db.prepare("INSERT INTO download_events (id, transfer_id, file_id, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), transfer.id, file.id, ip, c.req.header("User-Agent")||"", now).run()
    const headers = new Headers()
    obj.writeHttpMetadata(headers)
    headers.set("Content-Disposition", `attachment; filename="${file.original_name}"`)
    headers.set("Cache-Control", "no-store")
    return new Response(obj.body, { headers })
  }
})
