import { Hono } from "hono"
import { secureToken, shortSecureToken, hashPassword, verifyPassword } from "../lib/crypto"
import { getAuthUser } from "../middleware/auth"
import { checkRateLimit } from "../middleware/rateLimit"

export const transferRoutes = new Hono<{ Bindings: any }>()

// Create transfer (guest + auth)
transferRoutes.post("/", async (c) => {
  const db = c.env.DB as D1Database
  const ip = c.req.header("cf-connecting-ip") || "unknown"
  const rl = await checkRateLimit(db, `upload:${ip}`, parseInt(c.env.RATE_LIMIT_UPLOADS_PER_HOUR || "20"), 3600)
  if (!rl.allowed) return c.json({ error: "Rate limit: too many uploads. Try later." }, 429)

  const body = await c.req.json()
  const { files, expiryDays, password, maxDownloads, emailTo, message, title } = body
  if (!files || !Array.isArray(files) || files.length===0) return c.json({ error: "No files" }, 400)
  if (files.length > 50) return c.json({ error: "Max 50 files" }, 400)

  const totalSize = files.reduce((a:any,b:any)=>a+(b.size||0),0)
  if (totalSize > 2*1024*1024*1024*5) return c.json({ error: "Total too large" }, 400) // soft limit

  const user = await getAuthUser(c.req as any, c.env)
  const now = Math.floor(Date.now()/1000)
  const expDays = Math.min(30, Math.max(1, parseInt(expiryDays)||7))
  const expiresAt = now + expDays*86400
  const id = crypto.randomUUID()
  const token = shortSecureToken() + secureToken(8) // 21 + 16 hex = high entropy, never sequential
  const guestToken = !user ? secureToken(32) : null
  let pwHash = null
  if (password) pwHash = await hashPassword(password)

  await db.prepare("INSERT INTO transfers (id, token, owner_id, guest_token, title, message, password_hash, status, expiry_days, expires_at, max_downloads, total_size, files_count, email_to, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, token, user?.id||null, guestToken, title||null, message||null, pwHash, expDays, expiresAt, maxDownloads||null, totalSize, files.length, emailTo||null, now, now).run()

  for (const f of files) {
    const fid = crypto.randomUUID()
    const r2Key = `transfers/${id}/${fid}-${f.name}`
    await db.prepare("INSERT INTO transfer_files (id, transfer_id, filename, original_name, size, mime_type, r2_key, chunk_total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)").bind(fid, id, f.name, f.name, f.size, f.type||"application/octet-stream", r2Key, 1, now).run()
  }

  return c.json({ transferId: id, token, guestToken, expiresAt })
})

// List transfers (auth or guest via cookie?)
transferRoutes.get("/", async (c) => {
  const db = c.env.DB as D1Database
  const user = await getAuthUser(c.req as any, c.env)
  if (!user) {
    // For guests, return empty or check guest_token cookie
    return c.json({ transfers: [] })
  }
  const rows = await db.prepare("SELECT id, token, status, total_size, files_count, download_count, created_at, expires_at FROM transfers WHERE owner_id = ? ORDER BY created_at DESC LIMIT 100").bind(user.id).all()
  return c.json({ transfers: rows.results || [] })
})

// Get transfer by public token (download page)
transferRoutes.get("/t/:token", async (c) => {
  const token = c.req.param("token")
  const db = c.env.DB as D1Database
  const transfer = await db.prepare("SELECT id, token, title, message, password_hash, status, expires_at, max_downloads, download_count, total_size, created_at FROM transfers WHERE token = ?").bind(token).first() as any
  if (!transfer) return c.json({ error: "Transfer not found" }, 404)
  const now = Math.floor(Date.now()/1000)
  if (transfer.status !== "active" || transfer.expires_at < now) return c.json({ error: "Transfer expired" }, 410)
  if (transfer.max_downloads && transfer.download_count >= transfer.max_downloads) return c.json({ error: "Download limit reached" }, 410)

  const requiresPassword = !!transfer.password_hash
  // If password protected, check if ?unlock param or cookie
  const url = new URL(c.req.url)
  const unlocked = c.req.query("unlocked") === "1"

  const files = await db.prepare("SELECT id, original_name as filename, size, mime_type FROM transfer_files WHERE transfer_id = ? AND status = 'completed'").bind(transfer.id).all()

  if (requiresPassword && !unlocked) {
    return c.json({ requiresPassword: true, id: transfer.id, token: transfer.token, totalSize: transfer.total_size, filesCount: files.results?.length||0 })
  }

  return c.json({
    id: transfer.id,
    token: transfer.token,
    title: transfer.title,
    message: transfer.message,
    expiresAt: transfer.expires_at*1000,
    downloadCount: transfer.download_count,
    totalSize: transfer.total_size,
    files: files.results || [],
    requiresPassword: false,
    unlocked: true
  })
})

transferRoutes.post("/t/:token/unlock", async (c) => {
  const token = c.req.param("token")
  const { password } = await c.req.json()
  const db = c.env.DB as D1Database
  const transfer = await db.prepare("SELECT * FROM transfers WHERE token = ?").bind(token).first() as any
  if (!transfer || !transfer.password_hash) return c.json({ error: "Not found" }, 404)
  const ok = await verifyPassword(password, transfer.password_hash)
  if (!ok) return c.json({ error: "Invalid password" }, 401)
  const files = await db.prepare("SELECT id, original_name as filename, size, mime_type FROM transfer_files WHERE transfer_id = ? AND status = 'completed'").bind(transfer.id).all()
  return c.json({ id: transfer.id, token: transfer.token, title: transfer.title, message: transfer.message, expiresAt: transfer.expires_at*1000, downloadCount: transfer.download_count, totalSize: transfer.total_size, files: files.results||[], requiresPassword: false, unlocked: true })
})

// Finalize after chunks
transferRoutes.post("/:id/finalize", async (c) => {
  const id = c.req.param("id")
  const db = c.env.DB as D1Database
  const transfer = await db.prepare("SELECT * FROM transfers WHERE id = ?").bind(id).first() as any
  if (!transfer) return c.json({ error: "Transfer not found" }, 404)

  // Verify all files have completed upload (R2 key exists)
  const files = await db.prepare("SELECT * FROM transfer_files WHERE transfer_id = ?").bind(id).all()
  for (const f of (files.results as any[])) {
    if (f.status !== "completed") return c.json({ error: `File ${f.original_name} not fully uploaded yet` }, 400)
  }

  const origin = new URL(c.req.url).origin
  const downloadUrl = `${origin}/d/${transfer.token}`
  return c.json({ downloadUrl, token: transfer.token, transferId: id })
})
