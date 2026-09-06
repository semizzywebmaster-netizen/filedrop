import { Hono } from "hono"
import { checkRateLimit } from "../middleware/rateLimit"
import { getAuthUser } from "../middleware/auth"
import { hasTransferOwner } from "./transfers"

export const uploadRoutes = new Hono<{ Bindings: any }>()

const MIN_PART_SIZE = 5 * 1024 * 1024
const MAX_PART_SIZE = 5 * 1024 * 1024 * 1024
const MAX_PARTS = 10000

function safeInt(value: FormDataEntryValue | null) {
  const n = Number.parseInt(String(value ?? ""), 10)
  return Number.isSafeInteger(n) ? n : NaN
}

uploadRoutes.post("/chunk", async (c) => {
  const db = c.env.DB as D1Database
  const bucket = c.env.R2 as R2Bucket
  const form = await c.req.formData()
  const chunk = form.get("chunk")
  const index = safeInt(form.get("index"))
  const total = safeInt(form.get("total"))
  const filename = String(form.get("filename") || "")
  const fileId = String(form.get("fileId") || "")
  const transferId = String(form.get("transferId") || "")

  if (!(chunk instanceof File) || !fileId || !transferId || !filename || !Number.isInteger(index) || !Number.isInteger(total)) {
    return c.json({ error: "Invalid chunk" }, 400)
  }
  if (index < 0 || total < 1 || total > MAX_PARTS || index >= total) return c.json({ error: "Invalid chunk index" }, 400)

  const ip = c.req.header("cf-connecting-ip") || "unknown"
  const rl = await checkRateLimit(db, `chunk:${ip}`, 500, 3600)
  if (!rl.allowed) return c.json({ error: "Rate limited" }, 429)

  const transfer = await db.prepare("SELECT * FROM transfers WHERE id = ?").bind(transferId).first() as any
  if (!transfer) return c.json({ error: "Transfer not found" }, 404)
  if (transfer.status !== "active" || transfer.expires_at < Math.floor(Date.now() / 1000)) return c.json({ error: "Transfer expired" }, 410)
  if (!(await hasTransferOwner(c, transfer))) return c.json({ error: "Not authorized" }, 403)

  const fileRow = await db.prepare("SELECT * FROM transfer_files WHERE id = ? AND transfer_id = ?").bind(fileId, transferId).first() as any
  if (!fileRow) return c.json({ error: "File not in transfer" }, 404)
  if (fileRow.original_name !== filename) return c.json({ error: "Filename mismatch" }, 400)
  if (fileRow.status === "completed") return c.json({ ok: true, index, completed: true })
  if (fileRow.chunk_total && fileRow.chunk_total > 1 && fileRow.chunk_total !== total) return c.json({ error: "Chunk count mismatch" }, 409)

  const size = chunk.size
  if (size <= 0 || size > MAX_PART_SIZE) return c.json({ error: "Invalid chunk size" }, 413)
  if (index < total - 1 && size < MIN_PART_SIZE) return c.json({ error: "Non-final chunks must be at least 5 MiB" }, 400)

  const expectedParts = Math.ceil(fileRow.size / Math.max(MIN_PART_SIZE, size))
  if (total !== Math.ceil(fileRow.size / size) && total !== fileRow.chunk_total && total !== expectedParts) {
    return c.json({ error: "Chunk count does not match file size" }, 400)
  }

  let uploadId = fileRow.multipart_upload_id as string | null
  if (!uploadId) {
    const multipart = await bucket.createMultipartUpload(fileRow.r2_key, {
      httpMetadata: { contentType: fileRow.mime_type || "application/octet-stream" },
    })
    uploadId = multipart.uploadId
    await db.prepare("UPDATE transfer_files SET multipart_upload_id = ?, chunk_total = ?, status = 'uploading' WHERE id = ? AND multipart_upload_id IS NULL")
      .bind(uploadId, total, fileRow.id).run()
    const refreshed = await db.prepare("SELECT multipart_upload_id FROM transfer_files WHERE id = ?").bind(fileRow.id).first() as any
    uploadId = refreshed?.multipart_upload_id || uploadId
  }

  const multipart = bucket.resumeMultipartUpload(fileRow.r2_key, uploadId)
  let uploadedPart: R2UploadedPart
  try {
    uploadedPart = await multipart.uploadPart(index + 1, chunk.stream())
  } catch (error: any) {
    return c.json({ error: `Part upload failed: ${error?.message || "unknown error"}` }, 502)
  }

  const now = Math.floor(Date.now() / 1000)
  await db.prepare("INSERT INTO transfer_file_parts (id, file_id, part_number, etag, size, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(file_id, part_number) DO UPDATE SET etag = excluded.etag, size = excluded.size, created_at = excluded.created_at")
    .bind(crypto.randomUUID(), fileRow.id, uploadedPart.partNumber, uploadedPart.etag, size, now).run()

  const partCount = await db.prepare("SELECT COUNT(*) AS count FROM transfer_file_parts WHERE file_id = ?").bind(fileRow.id).first() as any
  const uploadedCount = Number(partCount?.count || 0)

  if (uploadedCount === total) {
    const rows = await db.prepare("SELECT part_number, etag FROM transfer_file_parts WHERE file_id = ? ORDER BY part_number ASC").bind(fileRow.id).all()
    const parts = (rows.results as any[]).map((p) => ({ partNumber: Number(p.part_number), etag: String(p.etag) }))
    if (parts.length !== total || parts.some((p, i) => p.partNumber !== i + 1)) {
      return c.json({ ok: true, index, uploadedParts: uploadedCount, completed: false })
    }

    try {
      await multipart.complete(parts)
    } catch (error: any) {
      return c.json({ error: `Upload completion failed: ${error?.message || "unknown error"}` }, 502)
    }

    await db.prepare("UPDATE transfer_files SET status = 'completed', chunk_uploaded = ?, chunk_total = ?, multipart_upload_id = NULL WHERE id = ?")
      .bind(total, total, fileRow.id).run()
    await db.prepare("DELETE FROM transfer_file_parts WHERE file_id = ?").bind(fileRow.id).run()
    return c.json({ ok: true, index, uploadedParts: total, completed: true })
  }

  await db.prepare("UPDATE transfer_files SET chunk_uploaded = ?, chunk_total = ?, status = 'uploading' WHERE id = ?")
    .bind(uploadedCount, total, fileRow.id).run()

  return c.json({ ok: true, index, uploadedParts: uploadedCount, completed: false })
})

// Lightweight endpoint used by clients to recover upload progress after a retry/reload.
uploadRoutes.get("/status/:transferId/:fileId", async (c) => {
  const db = c.env.DB as D1Database
  const transferId = c.req.param("transferId")
  const fileId = c.req.param("fileId")
  const transfer = await db.prepare("SELECT * FROM transfers WHERE id = ?").bind(transferId).first() as any
  if (!transfer) return c.json({ error: "Transfer not found" }, 404)
  if (!(await hasTransferOwner(c, transfer))) return c.json({ error: "Not authorized" }, 403)
  const file = await db.prepare("SELECT id, size, chunk_total, chunk_uploaded, status FROM transfer_files WHERE id = ? AND transfer_id = ?").bind(fileId, transferId).first() as any
  if (!file) return c.json({ error: "File not found" }, 404)
  const parts = await db.prepare("SELECT part_number FROM transfer_file_parts WHERE file_id = ? ORDER BY part_number ASC").bind(fileId).all()
  return c.json({ ...file, uploadedParts: (parts.results || []).map((p: any) => Number(p.part_number)) })
})
