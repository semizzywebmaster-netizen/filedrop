import { Hono } from "hono"
import { hashPassword, verifyPassword, secureToken } from "../lib/crypto"
import { createJWT } from "../lib/jwt"

export const authRoutes = new Hono<{ Bindings: any }>()

authRoutes.post("/register", async (c) => {
  const { name, email, password } = await c.req.json()
  if (!email || !password || password.length < 8) return c.json({ error: "Invalid input, password min 8" }, 400)
  const db = c.env.DB as D1Database
  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email.toLowerCase()).first()
  if (existing) return c.json({ error: "Email already registered" }, 409)
  const id = crypto.randomUUID()
  const now = Math.floor(Date.now()/1000)
  const pwHash = await hashPassword(password)
  const verificationToken = secureToken(32)
  await db.prepare("INSERT INTO users (id, email, name, password_hash, verification_token, verification_expires, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)").bind(id, email.toLowerCase(), name || email.split("@")[0], pwHash, verificationToken, now+86400, now, now).run()
  // Auto-verify for MVP (email delivery architecture ready)
  await db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").bind(id).run()
  const jwt = await createJWT({ id, email: email.toLowerCase(), name }, c.env.JWT_SECRET || "dev-secret-change-me", "7d")
  const tokenHash = await hashPassword(jwt)
  await db.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, ip) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, tokenHash, now+604800, now, c.req.header("cf-connecting-ip")||"").run()
  c.header("Set-Cookie", `fd_session=${encodeURIComponent(jwt)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`)
  return c.json({ user: { id, email, name } })
})

authRoutes.post("/login", async (c) => {
  const { email, password } = await c.req.json()
  const db = c.env.DB as D1Database
  const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email.toLowerCase()).first() as any
  if (!user) return c.json({ error: "Invalid credentials" }, 401)
  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return c.json({ error: "Invalid credentials" }, 401)
  const now = Math.floor(Date.now()/1000)
  const jwt = await createJWT({ id: user.id, email: user.email, name: user.name }, c.env.JWT_SECRET || "dev-secret-change-me", "7d")
  const tokenHash = await hashPassword(jwt)
  await db.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, ip) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), user.id, tokenHash, now+604800, now, c.req.header("cf-connecting-ip")||"").run()
  c.header("Set-Cookie", `fd_session=${encodeURIComponent(jwt)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`)
  return c.json({ user: { id: user.id, email: user.email, name: user.name } })
})

authRoutes.post("/logout", async (c) => {
  c.header("Set-Cookie", `fd_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
  return c.json({ ok: true })
})

authRoutes.get("/me", async (c) => {
  const cookie = c.req.header("Cookie") || ""
  const m = cookie.match(/fd_session=([^;]+)/)
  if (!m) return c.json({ user: null })
  try {
    const { verifyJWT } = await import("../lib/jwt")
    const payload = await verifyJWT(decodeURIComponent(m[1]), c.env.JWT_SECRET || "dev-secret-change-me")
    const db = c.env.DB as D1Database
    const user = await db.prepare("SELECT id, email, name, avatar_url, email_verified, created_at FROM users WHERE id = ?").bind((payload as any).id).first()
    return c.json({ user })
  } catch { return c.json({ user: null }) }
})
