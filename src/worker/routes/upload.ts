import { Hono } from "hono"
import { checkRateLimit } from "../middleware/rateLimit"

export const uploadRoutes = new Hono<{ Bindings: any }>()

uploadRoutes.post("/chunk", async (c) => {
  const db = c.env.DB as D1Database
  const bucket = c.env.R2 as R2Bucket
  const form = await c.req.formData()
  const chunk = form.get("chunk") as File
  const index = parseInt(form.get("index") as string)
  const total = parseInt(form.get("total") as string)
  const filename = form.get("filename") as string
  const transferId = form.get("transferId") as string

  if (!chunk || isNaN(index) || !transferId || !filename) return c.json({ error: "Invalid chunk" }, 400)

  const ip = c.req.header("cf-connecting-ip") || "unknown"
  const rl = await checkRateLimit(db, `chunk:${ip}`, 500, 3600)
  if (!rl.allowed) return c.json({ error: "Rate limited" }, 429)

  const transfer = await db.prepare("SELECT id FROM transfers WHERE id = ?").bind(transferId).first()
  if (!transfer) return c.json({ error: "Transfer not found" }, 404)

  const fileRow = await db.prepare("SELECT * FROM transfer_files WHERE transfer_id = ? AND original_name = ?").bind(transferId, filename).first() as any
  if (!fileRow) return c.json({ error: "File not in transfer" }, 404)

  const baseKey = fileRow.r2_key
  const partKey = `${baseKey}.part.${index}`
  const buf = await chunk.arrayBuffer()

  // Put part
  await bucket.put(partKey, buf)

  // If last chunk, assemble
  if (index === total - 1) {
    // Assemble all parts into final key
    const parts: Uint8Array[] = []
    for (let i=0;i<total;i++) {
      const obj = await bucket.get(`${baseKey}.part.${i}`)
      if (!obj) return c.json({ error: `Missing part ${i}` }, 400)
      parts.push(new Uint8Array(await obj.arrayBuffer()))
    }
    const totalLen = parts.reduce((a,b)=>a+b.length,0)
    const merged = new Uint8Array(totalLen)
    let off=0
    for (const p of parts) { merged.set(p, off); off+=p.length }
    await bucket.put(baseKey, merged, { httpMetadata: { contentType: fileRow.mime_type || "application/octet-stream" } })
    // Cleanup parts
    for (let i=0;i<total;i++) await bucket.delete(`${baseKey}.part.${i}`)
    await db.prepare("UPDATE transfer_files SET status = 'completed', chunk_uploaded = ?, chunk_total = ? WHERE id = ?").bind(total, total, fileRow.id).run()
  } else {
    await db.prepare("UPDATE transfer_files SET chunk_uploaded = ?, chunk_total = ?, status = 'uploading' WHERE id = ?").bind(index+1, total, fileRow.id).run()
  }

  return c.json({ ok: true, index })
})
