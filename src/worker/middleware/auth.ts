import { verifyJWT } from "../lib/jwt"

export type AuthUser = { id: string; email: string; name: string }

export async function getAuthUser(req: Request, env: any): Promise<AuthUser|null> {
  const cookie = req.headers.get("Cookie") || ""
  const match = cookie.match(/(?:^|;\s*)fd_session=([^;]+)/)
  if (!match) return null

  const secret = String(env?.JWT_SECRET || "").trim()
  if (!secret) return null

  try {
    const payload = await verifyJWT(decodeURIComponent(match[1]), secret) as any
    if (!payload?.id) return null
    return payload as AuthUser
  } catch {
    return null
  }
}
