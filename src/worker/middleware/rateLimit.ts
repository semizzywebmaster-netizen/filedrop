export async function checkRateLimit(db: D1Database, key: string, limit: number, windowSec: number = 3600): Promise<{ allowed: boolean; remaining: number }> {
  const now = Math.floor(Date.now()/1000)
  const windowStart = now - windowSec
  // Clean old
  await db.prepare("DELETE FROM rate_limits WHERE created_at < ?").bind(windowStart).run()
  const countRes = await db.prepare("SELECT COUNT(*) as c FROM rate_limits WHERE key = ? AND created_at >= ?").bind(key, windowStart).first() as any
  const count = countRes?.c || 0
  if (count >= limit) return { allowed: false, remaining: 0 }
  await db.prepare("INSERT INTO rate_limits (id, key, created_at) VALUES (?, ?, ?)").bind(crypto.randomUUID(), key, now).run()
  return { allowed: true, remaining: limit - count - 1 }
}
