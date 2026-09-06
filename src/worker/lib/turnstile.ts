export async function verifyTurnstile(token: string, secret: string, ip?: string): Promise<boolean> {
  if (!secret) return true // disabled if no secret configured (dev)
  const form = new FormData()
  form.append("secret", secret)
  form.append("response", token)
  if (ip) form.append("remoteip", ip)
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form })
  const data = await res.json() as any
  return data.success === true
}
