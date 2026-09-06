import { Hono } from "hono"
import { hashPassword, verifyPassword, secureToken } from "../lib/crypto"
import { createJWT, verifyJWT } from "../lib/jwt"

export const authRoutes = new Hono<{ Bindings: any }>()

function getJwtSecret(env: any): string | null {
  const secret = String(env?.JWT_SECRET || "").trim()
  return secret || null
}

function readSessionCookie(req: Request) {
  const cookie = req.headers.get("Cookie") || ""
  const match = cookie.match(/(?:^|;\s*)fd_session=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

authRoutes.post("/register", async (c) => {
  const { name, email, password } = await c.req.json()
  if (!email || !password || password.length < 8) return c.json({ error: "Invalid input, password min 8" }, 400)
  const jwtSecret = getJwtSecret(c.env)
  if (!jwtSecret) return c.json({ error: "Authentication service is not configured" }, 503)

  const db = c.env.DB as D1Database
  const normalizedEmail = String(email).trim().toLowerCase()
  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(normalizedEmail).first()
  if (existing) return c.json({ error: "Email already registered" }, 409)
  const id = crypto.randomUUID()
  const now = Math.floor(Date.now()/1000)
  const displayName = name || normalizedEmail.split("@")[0]
  const pwHash = await hashPassword(password)
  const verificationToken = secureToken(32)
  await db.prepare("INSERT INTO users (id, email, name, password_hash, verification_token, verification_expires, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)").bind(id, normalizedEmail, displayName, pwHash, verificationToken, now+86400, now, now).run()
  // Auto-verify for MVP (email delivery architecture ready)
  await db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").bind(id).run()
  const jwt = await createJWT({ id, email: normalizedEmail, name: displayName }, jwtSecret, "7d")
  const tokenHash = await hashPassword(jwt)
  await db.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, tokenHash, now+604800, now, c.req.header("cf-connecting-ip")||"", c.req.header("User-Agent")||"").run()
  c.header("Set-Cookie", `fd_session=${encodeURIComponent(jwt)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`)
  return c.json({ user: { id, email: normalizedEmail, name: displayName } })
})

authRoutes.post("/login", async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: "Invalid credentials" }, 401)
  const jwtSecret = getJwtSecret(c.env)
  if (!jwtSecret) return c.json({ error: "Authentication service is not configured" }, 503)

  const db = c.env.DB as D1Database
  const normalizedEmail = String(email).trim().toLowerCase()
  const user = await db.prepare("SELECT * FROM users WHERE email = ? AND deleted_at IS NULL").bind(normalizedEmail).first() as any
  if (!user) return c.json({ error: "Invalid credentials" }, 401)
  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return c.json({ error: "Invalid credentials" }, 401)
  const now = Math.floor(Date.now()/1000)
  const jwt = await createJWT({ id: user.id, email: user.email, name: user.name }, jwtSecret, "7d")
  const tokenHash = await hashPassword(jwt)
  await db.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), user.id, tokenHash, now+604800, now, c.req.header("cf-connecting-ip")||"", c.req.header("User-Agent")||"").run()
  c.header("Set-Cookie", `fd_session=${encodeURIComponent(jwt)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`)
  return c.json({ user: { id: user.id, email: user.email, name: user.name } })
})

authRoutes.post("/logout", async (c) => {
  c.header("Set-Cookie", `fd_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
  return c.json({ ok: true })
})

authRoutes.get("/me", async (c) => {
  const token = readSessionCookie(c.req.raw)
  const jwtSecret = getJwtSecret(c.env)
  if (!token || !jwtSecret) return c.json({ user: null })
  try {
    const payload = await verifyJWT(token, jwtSecret) as any
    if (!payload?.id) return c.json({ user: null })
    const db = c.env.DB as D1Database
    const user = await db.prepare("SELECT id, email, name, avatar_url, email_verified, created_at FROM users WHERE id = ? AND deleted_at IS NULL").bind(payload.id).first()
    return c.json({ user })
  } catch { return c.json({ user: null }) }
})
