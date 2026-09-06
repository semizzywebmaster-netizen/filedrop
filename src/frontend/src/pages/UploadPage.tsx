import { useState } from "react"
import { DropZone, FileQueue } from "@/components/upload/DropZone"
import { TransferSettings } from "@/components/upload/TransferSettings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert } from "@/components/ui/alert"
import { formatBytes } from "@/lib/utils"

export function UploadPage({ onComplete }: { onComplete?: (link:string)=>void }) {
  const [files, setFiles] = useState<File[]>([])
  const [settings, setSettings] = useState<any>({ expiryDays: 7 })
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ link: string; token: string }|null>(null)
  const [error, setError] = useState("")

  const handleUpload = async () => {
    if (!files.length) return
    setUploading(true); setError(""); setProgress(5)
    try {
      // 1. Create transfer
      const res = await fetch("/api/transfers", { method: "POST", headers: { "Content-Type":"application/json" }, credentials: "include", body: JSON.stringify({ files: files.map(f=>({name:f.name,size:f.size,type:f.type})), ...settings }) })
      if (!res.ok) throw new Error("Failed to create transfer")
      const data = await res.json()
      const transferId = data.transferId
      setProgress(15)
      // 2. Chunked upload each file
      let completed = 0
      for (const file of files) {
        const CHUNK = 5*1024*1024
        const total = Math.ceil(file.size / CHUNK)
        for (let i=0;i<total;i++) {
          const chunk = file.slice(i*CHUNK, (i+1)*CHUNK)
          const fd = new FormData()
          fd.append("chunk", chunk); fd.append("index", String(i)); fd.append("total", String(total)); fd.append("filename", file.name); fd.append("transferId", transferId)
          const r = await fetch("/api/upload/chunk", { method: "POST", body: fd, credentials: "include" })
          if (!r.ok) throw new Error("Chunk failed for "+file.name)
          setProgress(15 + (completed + (i+1)/total)/files.length*70)
        }
        completed++
      }
      // 3. Finalize
      const fin = await fetch(`/api/transfers/${transferId}/finalize`, { method: "POST", credentials: "include" })
      if (!fin.ok) throw new Error("Finalize failed")
      const finData = await fin.json()
      setProgress(100); setResult({ link: finData.downloadUrl, token: finData.token })
      if (onComplete) onComplete(finData.downloadUrl)
    } catch (e:any) { setError(e.message) } finally { setUploading(false) }
  }

  if (result) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader><CardTitle>Transfer ready! 🎉</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-zinc-900 text-white p-4 font-mono text-sm break-all">{result.link}</div>
          <div className="flex gap-2"><Button onClick={()=>navigator.clipboard.writeText(result.link)}>Copy link</Button><Button variant="outline" onClick={()=>{setResult(null); setFiles([]); setProgress(0)}}>New transfer</Button></div>
          <p className="text-xs text-muted-foreground">Link expires in {settings.expiryDays} days. Files stored temporarily in R2.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-5xl mx-auto grid lg:grid-cols-[1.6fr_0.9fr] gap-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">New transfer</h1>
          <p className="text-sm text-muted-foreground">Files are encrypted at rest in Cloudflare R2 and auto-deleted after expiry.</p>
        </div>
        <DropZone onFiles={f=>setFiles(prev=>[...prev, ...f].slice(0,50))} />
        {files.length>0 && <FileQueue files={files} onRemove={i=>setFiles(files.filter((_,idx)=>idx!==i))} />}
        {uploading && <div className="space-y-2"><Progress value={progress} /><p className="text-xs text-muted-foreground">{Math.round(progress)}% • Uploading {files.length} files • {formatBytes(files.reduce((a,b)=>a+b.size,0))} total</p></div>}
        {error && <Alert variant="destructive">{error}</Alert>}
        <Button size="lg" disabled={!files.length || uploading} onClick={handleUpload} className="w-full">{uploading?`Uploading ${Math.round(progress)}%`:`Transfer ${files.length} file${files.length!==1?"s":""} — Get link`}</Button>
      </div>
      <div className="space-y-6">
        <TransferSettings onChange={setSettings} />
        <Card><CardContent className="p-4 text-xs text-muted-foreground space-y-2"><p><strong>How it works:</strong></p><p>1. Chunked upload (5MB) → R2</p><p>2. Secure token: crypto.randomBytes + nanoid (never sequential IDs)</p><p>3. Link: /d/:token</p><p>4. Auto-delete via Cron</p></CardContent></Card>
      </div>
    </div>
  )
}
