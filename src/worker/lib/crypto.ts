export function secureToken(length=32): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b=>b.toString(16).padStart(2,"0")).join("")
}
export function shortSecureToken(): string {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  const bytes = new Uint8Array(21)
  crypto.getRandomValues(bytes)
  let id=""
  for (let i=0;i<21;i++) id+=alphabet[bytes[i]%alphabet.length]
  return id
}
export async function hashPassword(pw: string): Promise<string> {
  // bcryptjs via dynamic import to keep worker slim, fallback to SHA-256 + salt if needed
  const bcrypt = await import("bcryptjs")
  return bcrypt.hash(pw, 12)
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcryptjs")
  return bcrypt.compare(pw, hash)
}
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("")
}
