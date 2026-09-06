import { verifyJWT } from "../lib/jwt"
import { checkRateLimit } from "../middleware/rateLimit"
import { Hono } from "hono"
import { Zip, ZipPassThrough } from "fflate"

export const downloadRoutes = new Hono<{ Bindings: any }>()

function readCookie(req: Request, name: string) {
  const cookie = req.headers.get("Cookie") || ""
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

async function isUnlocked(c: any, token: string) {
  const value = readCookie(c.req.raw as Request, `fd_unlock_${token}`)
  if (!value) return false
  try {
    const payload = await verifyJWT(value, c.env.JWT_SECRET)
    return (payload as any).purpose === "transfer_unlock" && (payload as any).token === token
  } catch {
    return false
  }
}

function safeFilename(name: string) {
  const cleaned = String(name || "download")
    .replace(/[\\"\r\n]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, "_")
    .trim()
  return cleaned.slice(0, 180) || "download"
}

function quoteFilename(name: string) {
  const ascii = safeFilename(name).replace(/[^\x20-\x7E]/g, "_")
  return `attachment; filename="${ascii}"`
}

async function consumeDownloadSlot(db: D1Database, transferId: string) {
  const result = await db.prepare(`
    UPDATE transfers
    SET download_count = download_count + 1, updated_at = ?
    WHERE id = ? AND status = 'active'
      AND (max_downloads IS NULL OR download_count < max_downloads)
  `).bind(Math.floor(Date.now() / 1000), transferId).run()
  return Boolean(result.success && (result.meta?.changes || 0) > 0)
}

async function logDownload(c: any, transferId: string, fileId: string | null, ip: string, now: number) {
  await c.env.DB.prepare(
    "INSERT INTO download_events (id, transfer_id, file_id, ip, user_agent, country, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    crypto.randomUUID(),
    transferId,
    fileId,
    ip,
    c.req.header("User-Agent") || "",
    c.req.header("CF-IPCountry") || null,
    now
  ).run()
}

async function streamZip(c: any, files: any[]) {
  const bucket = c.env.R2 as R2Bucket
  let failed: unknown = null

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const zip = new Zip((err, chunk, final) => {
        if (err) {
          failed = err
          try { controller.error(err) } catch {}
          return
        }
        if (chunk) controller.enqueue(chunk)
        if (final) controller.close()
      })

      try {
        const usedNames = new Set<string>()

        for (const file of files) {
          const object = await bucket.get(file.r2_key)
          if (!object?.body) throw new Error(`Missing object: ${file.id}`)

          let name = safeFilename(file.original_name)
          const base = name.replace(/(\.[^.]+)$/, "") || name
          const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : ""
          let candidate = name
          let n = 2
          while (usedNames.has(candidate.toLowerCase())) {
            candidate = `${base} (${n++})${ext}`
          }
          usedNames.add(candidate.toLowerCase())

          const entry = new ZipPassThrough(candidate)
          zip.add(entry)
          const reader = object.body.getReader()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              entry.push(value)
            }
          } finally {
            reader.releaseLock()
          }
          entry.push(new Uint8Array(0), true)
        }

        zip.end()
      } catch (error) {
        failed = error
        try { controller.error(error) } catch {}
      }
    }
  })

  if (failed) return c.text("Unable to create ZIP", 500)

  const headers = new Headers()
  headers.set("Content-Type", "application/zip")
  headers.set("Content-Disposition", quoteFilename(`${safeFilename(c.req.param("token"))}-files.zip`))
  headers.set("Cache-Control", "private, no-store, max-age=0")
  headers.set("X-Content-Type-Options", "nosniff")
  headers.set("Content-Security-Policy", "sandbox")
  return new Response(body, { status: 200, headers })
}

downloadRoutes.get("/:token/:fileId?", async (c) => {
  const token = c.req.param("token")
  const fileId = c.req.param("fileId")
  const db = c.env.DB as D1Database
  const bucket = c.env.R2 as R2Bucket
  const ip = c.req.header("cf-connecting-ip") || "unknown"
  const now = Math.floor(Date.now() / 1000)

  const rl = await checkRateLimit(db, `dl:${ip}`, parseInt(c.env.RATE_LIMIT_DOWNLOADS_PER_HOUR || "100"), 3600)
  if (!rl.allowed) return c.text("Rate limited", 429)

  const transfer = await db.prepare("SELECT * FROM transfers WHERE token = ?").bind(token).first() as any
  if (!transfer) return c.text("Not found", 404)
  if (transfer.status !== "active" || transfer.expires_at < now) return c.text("Expired", 410)
  if (transfer.password_hash && !(await isUnlocked(c, token))) return c.text("Password required", 401)

  const filesResult = await db.prepare(
    "SELECT * FROM transfer_files WHERE transfer_id = ? AND status='completed' ORDER BY created_at ASC"
  ).bind(transfer.id).all() as any
  const files = (filesResult.results || []) as any[]
  if (files.length === 0) return c.text("No files", 404)

  if (!fileId && files.length > 1) {
    const objectChecks = await Promise.all(files.map(f => bucket.head(f.r2_key)))
    if (objectChecks.some(obj => !obj)) return c.text("One or more files are missing from storage", 404)
    if (!(await consumeDownloadSlot(db, transfer.id))) return c.text("Download limit reached", 410)
    await logDownload(c, transfer.id, null, ip, now)
    return streamZip(c, files)
  }

  const file = (fileId
    ? await db.prepare("SELECT * FROM transfer_files WHERE id = ? AND transfer_id = ? AND status='completed'").bind(fileId, transfer.id).first()
    : files[0]) as any
  if (!file) return c.text("File not found", 404)

  const object = await bucket.head(file.r2_key)
  if (!object) return c.text("File not in storage", 404)

  if (!(await consumeDownloadSlot(db, transfer.id))) return c.text("Download limit reached", 410)
  await logDownload(c, transfer.id, file.id, ip, now)

  const request = c.req.raw as Request
  const rangeHeader = request.headers.get("Range")
  const obj = await bucket.get(file.r2_key, rangeHeader ? { range: request.headers } : undefined)
  if (!obj?.body) return c.text("File not in storage", 404)

  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set("Content-Disposition", quoteFilename(file.original_name))
  headers.set("Cache-Control", "private, no-store, max-age=0")
  headers.set("X-Content-Type-Options", "nosniff")
  headers.set("Accept-Ranges", "bytes")
  if (obj.range) {
    headers.set("Content-Range", `bytes ${obj.range.offset}-${obj.range.offset + obj.range.length - 1}/${object.size}`)
    headers.set("Content-Length", String(obj.range.length))
  } else {
    headers.set("Content-Length", String(obj.size))
  }

  return new Response(obj.body, { status: obj.range ? 206 : 200, headers })
})
