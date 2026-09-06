import { Hono } from "hono"
import { getAuthUser } from "../middleware/auth"

export const adminRoutes = new Hono<{ Bindings: any }>()

// Admin middleware
async function requireAdmin(c: any, next: any) {
  const user = await getAuthUser(c.req as any, c.env)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  const db = c.env.DB as D1Database
  const row = await db.prepare("SELECT is_admin, role FROM users WHERE id = ?").bind(user.id).first() as any
  // Allow if is_admin = 1 or role = admin, OR if no admin exists yet, allow first user to bootstrap (dev mode)
  const adminCount = await db.prepare("SELECT COUNT(*) as c FROM users WHERE is_admin = 1").first() as any
  const isFirstAdmin = (adminCount?.c || 0) === 0
  if (!row || (row.is_admin !== 1 && row.role !== 'admin' && !isFirstAdmin)) {
    return c.json({ error: "Forbidden: admin only" }, 403)
  }
  c.set("adminUser", { ...user, dbRow: row })
  await next()
}

adminRoutes.use("*", requireAdmin)

// Dashboard stats
adminRoutes.get("/stats", async (c) => {
  const db = c.env.DB as D1Database
  const now = Math.floor(Date.now()/1000)
  const dayAgo = now - 86400
  const weekAgo = now - 7*86400

  const usersTotal = await db.prepare("SELECT COUNT(*) as c FROM users").first() as any
  const usersWeek = await db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= ?").bind(weekAgo).first() as any
  const transfersActive = await db.prepare("SELECT COUNT(*) as c FROM transfers WHERE status='active'").first() as any
  const transfersExpired = await db.prepare("SELECT COUNT(*) as c FROM transfers WHERE status='expired'").first() as any
  const filesTotal = await db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(size),0) as s FROM transfer_files WHERE status='completed'").first() as any
  const downloadsTotal = await db.prepare("SELECT COUNT(*) as c FROM download_events").first() as any
  const downloadsDay = await db.prepare("SELECT COUNT(*) as c FROM download_events WHERE created_at >= ?").bind(dayAgo).first() as any
  const storageUsed = filesTotal?.s || 0
  const abuseOpen = await db.prepare("SELECT COUNT(*) as c FROM abuse_reports WHERE status='open'").first() as any

  const recentTransfers = await db.prepare("SELECT t.id, t.token, t.status, t.total_size, t.download_count, t.created_at, u.email as owner_email FROM transfers t LEFT JOIN users u ON t.owner_id = u.id ORDER BY t.created_at DESC LIMIT 10").all()
  const recentUsers = await db.prepare("SELECT id, email, name, is_admin, created_at FROM users ORDER BY created_at DESC LIMIT 10").all()

  return c.json({
    totals: {
      users: usersTotal?.c||0,
      usersWeek: usersWeek?.c||0,
      transfersActive: transfersActive?.c||0,
      transfersExpired: transfersExpired?.c||0,
      files: filesTotal?.c||0,
      storageBytes: storageUsed,
      downloads: downloadsTotal?.c||0,
      downloadsDay: downloadsDay?.c||0,
      abuseOpen: abuseOpen?.c||0
    },
    recentTransfers: recentTransfers.results||[],
    recentUsers: recentUsers.results||[]
  })
})

// Users management
adminRoutes.get("/users", async (c) => {
  const db = c.env.DB as D1Database
  const q = c.req.query("q") || ""
  const limit = Math.min(100, parseInt(c.req.query("limit")||"50"))
  const offset = parseInt(c.req.query("offset")||"0")
  let sql = "SELECT id, email, name, is_admin, role, email_verified, storage_used, created_at, banned_at FROM users"
  let params: any[] = []
  if (q) { sql += " WHERE email LIKE ? OR name LIKE ?"; params = [`%${q}%`, `%${q}%`] }
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
  params.push(limit, offset)
  const res = await db.prepare(sql).bind(...params).all()
  return c.json({ users: res.results||[] })
})

adminRoutes.post("/users/:id/toggle-admin", async (c) => {
  const id = c.req.param("id")
  const db = c.env.DB as D1Database
  const user = await db.prepare("SELECT is_admin FROM users WHERE id = ?").bind(id).first() as any
  if (!user) return c.json({ error: "User not found" }, 404)
  await db.prepare("UPDATE users SET is_admin = ? WHERE id = ?").bind(user.is_admin ? 0 : 1, id).run()
  await db.prepare("INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), (c.get("adminUser") as any).id, "toggle_admin", "user", id, Math.floor(Date.now()/1000)).run()
  return c.json({ ok: true, is_admin: user.is_admin ? 0 : 1 })
})

adminRoutes.post("/users/:id/ban", async (c) => {
  const id = c.req.param("id")
  const db = c.env.DB as D1Database
  const { banned } = await c.req.json()
  await db.prepare("UPDATE users SET banned_at = ? WHERE id = ?").bind(banned ? Math.floor(Date.now()/1000) : null, id).run()
  return c.json({ ok: true })
})

adminRoutes.delete("/users/:id", async (c) => {
  const id = c.req.param("id")
  const db = c.env.DB as D1Database
  await db.prepare("UPDATE users SET deleted_at = ? WHERE id = ?").bind(Math.floor(Date.now()/1000), id).run()
  return c.json({ ok: true })
})

// Transfers management
adminRoutes.get("/transfers", async (c) => {
  const db = c.env.DB as D1Database
  const status = c.req.query("status") || "active"
  const q = c.req.query("q") || ""
  const limit = Math.min(100, parseInt(c.req.query("limit")||"50"))
  let sql = "SELECT t.id, t.token, t.title, t.status, t.total_size, t.files_count, t.download_count, t.expires_at, t.created_at, t.email_to, u.email as owner_email FROM transfers t LEFT JOIN users u ON t.owner_id = u.id WHERE 1=1"
  let params: any[] = []
  if (status !== "all") { sql += " AND t.status = ?"; params.push(status) }
  if (q) { sql += " AND (t.token LIKE ? OR t.title LIKE ?)"; params.push(`%${q}%`, `%${q}%`) }
  sql += " ORDER BY t.created_at DESC LIMIT ?"
  params.push(limit)
  const res = await db.prepare(sql).bind(...params).all()
  return c.json({ transfers: res.results||[] })
})

adminRoutes.delete("/transfers/:id", async (c) => {
  const id = c.req.param("id")
  const db = c.env.DB as D1Database
  const bucket = c.env.R2 as R2Bucket
  const files = await db.prepare("SELECT r2_key FROM transfer_files WHERE transfer_id = ?").bind(id).all() as any
  for (const f of (files.results||[])) {
    try { await bucket.delete(f.r2_key) } catch {}
  }
  await db.prepare("DELETE FROM transfer_files WHERE transfer_id = ?").bind(id).run()
  await db.prepare("DELETE FROM download_events WHERE transfer_id = ?").bind(id).run()
  await db.prepare("DELETE FROM transfers WHERE id = ?").bind(id).run()
  const adminId = (c.get("adminUser") as any).id
  await db.prepare("INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), adminId, "delete_transfer", "transfer", id, Math.floor(Date.now()/1000)).run()
  return c.json({ ok: true })
})

adminRoutes.post("/transfers/:id/expire", async (c) => {
  const id = c.req.param("id")
  const db = c.env.DB as D1Database
  await db.prepare("UPDATE transfers SET status='expired', updated_at=? WHERE id=?").bind(Math.floor(Date.now()/1000), id).run()
  return c.json({ ok: true })
})

// Files
adminRoutes.get("/files", async (c) => {
  const db = c.env.DB as D1Database
  const res = await db.prepare("SELECT tf.id, tf.original_name, tf.size, tf.mime_type, tf.status, tf.created_at, t.token, t.id as transfer_id FROM transfer_files tf JOIN transfers t ON tf.transfer_id = t.id ORDER BY tf.created_at DESC LIMIT 100").all()
  return c.json({ files: res.results||[] })
})

// Security & abuse
adminRoutes.get("/security/events", async (c) => {
  const db = c.env.DB as D1Database
  const res = await db.prepare("SELECT * FROM security_events ORDER BY created_at DESC LIMIT 100").all()
  return c.json({ events: res.results||[] })
})

adminRoutes.get("/abuse/reports", async (c) => {
  const db = c.env.DB as D1Database
  const res = await db.prepare("SELECT ar.*, t.token FROM abuse_reports ar LEFT JOIN transfers t ON ar.transfer_id = t.id ORDER BY ar.created_at DESC LIMIT 100").all()
  return c.json({ reports: res.results||[] })
})

adminRoutes.post("/abuse/reports/:id/status", async (c) => {
  const id = c.req.param("id")
  const { status } = await c.req.json()
  const db = c.env.DB as D1Database
  await db.prepare("UPDATE abuse_reports SET status = ? WHERE id = ?").bind(status, id).run()
  return c.json({ ok: true })
})

// System settings
adminRoutes.get("/settings", async (c) => {
  const db = c.env.DB as D1Database
  const settings = await db.prepare("SELECT key, value, updated_at FROM system_settings ORDER BY key").all()
  const flags = await db.prepare("SELECT key, enabled, config, updated_at FROM feature_flags ORDER BY key").all()
  return c.json({ settings: settings.results||[], flags: flags.results||[] })
})

adminRoutes.post("/settings", async (c) => {
  const { key, value } = await c.req.json()
  const db = c.env.DB as D1Database
  const now = Math.floor(Date.now()/1000)
  await db.prepare("INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at").bind(key, String(value), now).run()
  const adminId = (c.get("adminUser") as any).id
  await db.prepare("INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), adminId, "update_setting", "setting", key, value, now).run()
  return c.json({ ok: true })
})

adminRoutes.post("/flags", async (c) => {
  const { key, enabled, config } = await c.req.json()
  const db = c.env.DB as D1Database
  const now = Math.floor(Date.now()/1000)
  await db.prepare("INSERT INTO feature_flags (key, enabled, config, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET enabled=excluded.enabled, config=excluded.config, updated_at=excluded.updated_at").bind(key, enabled?1:0, config ? JSON.stringify(config) : null, now).run()
  return c.json({ ok: true })
})

// Admin logs
adminRoutes.get("/logs", async (c) => {
  const db = c.env.DB as D1Database
  const res = await db.prepare("SELECT al.*, u.email as admin_email FROM admin_logs al LEFT JOIN users u ON al.admin_id = u.id ORDER BY al.created_at DESC LIMIT 100").all()
  return c.json({ logs: res.results||[] })
})

// Storage overview
adminRoutes.get("/storage", async (c) => {
  const db = c.env.DB as D1Database
  const bucket = c.env.R2 as R2Bucket
  // D1 stats
  const stats = await db.prepare("SELECT COUNT(*) as files, COALESCE(SUM(size),0) as bytes, AVG(size) as avg FROM transfer_files WHERE status='completed'").first() as any
  // Try list R2 (may be truncated)
  let r2Count = 0
  try {
    const listed = await bucket.list({ limit: 1000 })
    r2Count = listed.objects.length
  } catch {}
  return c.json({ d1: stats, r2ObjectsSample: r2Count })
})

// Make user admin (bootstrap)
adminRoutes.post("/bootstrap", async (c) => {
  const db = c.env.DB as D1Database
  const count = await db.prepare("SELECT COUNT(*) as c FROM users WHERE is_admin=1").first() as any
  if ((count?.c||0) > 0) return c.json({ error: "Admin already exists" }, 400)
  const user = await getAuthUser(c.req as any, c.env)
  if (!user) return c.json({ error: "Login required" }, 401)
  await db.prepare("UPDATE users SET is_admin=1, role='admin' WHERE id=?").bind(user.id).run()
  return c.json({ ok: true, message: "You are now admin" })
})
