import { verifyJWT } from "../lib/jwt"
import { verifyPassword } from "../lib/crypto"

export type AuthUser = { id: string; email: string; name: string }

export async function getAuthUser(req: Request, env: any): Promise<AuthUser|null> {
  const cookie = req.headers.get("Cookie") || ""
  const match = cookie.match(/(?:^|;\s*)fd_session=([^;]+)/)
  if (!match) return null

  const secret = String(env?.JWT_SECRET || "").trim()
  if (!secret) return null

  try {
    const token = decodeURIComponent(match[1])
    const payload = await verifyJWT(token, secret) as any
    if (!payload?.id || !payload?.sid) return null

    const db = env.DB as D1Database
    const session = await db.prepare(
      "SELECT id, user_id, token_hash, expires_at FROM sessions WHERE id = ? AND user_id = ?"
    ).bind(String(payload.sid), String(payload.id)).first() as any
    if (!session || Number(session.expires_at) <= Math.floor(Date.now() / 1000)) return null

    // Bind the JWT to the server-side session so a stolen/revoked token cannot
    // remain usable after its session is removed.
    if (!(await verifyPassword(token, String(session.token_hash)))) return null

    return {
      id: String(payload.id),
      email: String(payload.email || ""),
      name: String(payload.name || "")
    }
  } catch {
    return null
  }
}
