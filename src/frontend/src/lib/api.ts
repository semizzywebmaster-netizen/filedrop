const API_BASE = "/api"
export async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers||{}) },
    credentials: "include"
  })
  if (!res.ok) {
    const err = await res.json().catch(()=>({error: res.statusText}))
    throw new Error(err.error || err.message || "Request failed")
  }
  return res.json()
}
export async function uploadFile(file: File, transferId: string, onProgress?: (pct: number)=>void) {
  // Chunked upload 5MB chunks
  const CHUNK = 5*1024*1024
  const totalChunks = Math.ceil(file.size / CHUNK)
  for (let i=0;i<totalChunks;i++) {
    const chunk = file.slice(i*CHUNK, (i+1)*CHUNK)
    const fd = new FormData()
    fd.append("chunk", chunk)
    fd.append("index", String(i))
    fd.append("total", String(totalChunks))
    fd.append("filename", file.name)
    fd.append("transferId", transferId)
    const res = await fetch(`/api/upload/chunk`, { method: "POST", body: fd, credentials: "include" })
    if (!res.ok) throw new Error("Chunk upload failed")
    if (onProgress) onProgress(((i+1)/totalChunks)*100)
  }
  return true
}
