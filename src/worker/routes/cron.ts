import { Hono } from "hono"
export const cronRoutes = new Hono<{ Bindings: any }>()

export async function handleCron(env: any) {
  const db = env.DB as D1Database
  const bucket = env.R2 as R2Bucket
  const now = Math.floor(Date.now()/1000)
  console.log(`[CRON] Running cleanup at ${now}`)

  const expired = await db.prepare("SELECT id FROM transfers WHERE (expires_at < ? OR (max_downloads IS NOT NULL AND download_count >= max_downloads)) AND status = 'active'").bind(now).all() as any

  let deletedFiles = 0
  let deletedTransfers = 0
  let abortedMultipart = 0

  for (const row of (expired.results||[])) {
    const transferId = row.id
    const files = await db.prepare("SELECT id, r2_key, multipart_upload_id FROM transfer_files WHERE transfer_id = ?").bind(transferId).all() as any
    for (const f of (files.results||[])) {
      try {
        if (f.multipart_upload_id) {
          try {
            await bucket.resumeMultipartUpload(f.r2_key, f.multipart_upload_id).abort()
            abortedMultipart++
          } catch (e) {
            console.warn("Multipart abort skipped", f.r2_key, e)
          }
        }
        await bucket.delete(f.r2_key)
        const list = await bucket.list({ prefix: f.r2_key+".part." })
        for (const obj of list.objects) await bucket.delete(obj.key)
        deletedFiles++
      } catch (e) { console.error("R2 delete failed", f.r2_key, e) }
    }
    await db.prepare("DELETE FROM transfer_files WHERE transfer_id = ?").bind(transferId).run()
    await db.prepare("UPDATE transfers SET status = 'expired', updated_at = ? WHERE id = ?").bind(now, transferId).run()
    deletedTransfers++
  }

  const oldThreshold = now - 30*86400
  const oldTransfers = await db.prepare("SELECT id FROM transfers WHERE status = 'expired' AND updated_at < ?").bind(oldThreshold).all() as any
  for (const row of (oldTransfers.results||[])) {
    await db.prepare("DELETE FROM download_events WHERE transfer_id = ?").bind(row.id).run()
    await db.prepare("DELETE FROM abuse_reports WHERE transfer_id = ?").bind(row.id).run()
    await db.prepare("DELETE FROM transfers WHERE id = ?").bind(row.id).run()
  }

  await db.prepare("DELETE FROM rate_limits WHERE created_at < ?").bind(now - 86400).run()
  await db.prepare("DELETE FROM security_events WHERE created_at < ?").bind(now - 90*86400).run()

  console.log(`[CRON] Cleaned ${deletedTransfers} transfers, ${deletedFiles} files, aborted ${abortedMultipart} multipart uploads`)
  return { deletedTransfers, deletedFiles, abortedMultipart }
}

cronRoutes.get("/cleanup", async (c) => {
  const secret = c.req.query("secret")
  const configuredSecret = String(c.env.CRON_SECRET || "").trim()
  if (!configuredSecret || secret !== configuredSecret) return c.text("Unauthorized", 401)
  const result = await handleCron(c.env)
  return c.json(result)
})
