import { SignJWT, jwtVerify } from "jose"
export async function createJWT(payload: any, secret: string, expiresIn="7d") {
  const key = new TextEncoder().encode(secret)
  return await new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expiresIn).sign(key)
}
export async function verifyJWT(token: string, secret: string) {
  const key = new TextEncoder().encode(secret)
  const { payload } = await jwtVerify(token, key)
  return payload
}
