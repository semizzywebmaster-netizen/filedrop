import { verifyJWT } from "../lib/jwt"
export type AuthUser = { id: string; email: string; name: string }
export async function getAuthUser(req: Request, env: any): Promise<AuthUser|null> {
  const cookie = req.headers.get("Cookie") || ""
  const match = cookie.match(/fd_session=([^;]+)/)
  if (!match) return null
  try {
    const payload = await verifyJWT(decodeURIComponent(match[1]), env.JWT_SECRET || "dev-secret-change-me")
    return payload as any
  } catch { return null }
}
