import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert } from "@/components/ui/alert"
import { formatBytes } from "@/lib/utils"

export function DownloadPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(true)
  useEffect(()=>{
    fetch(`/api/transfers/t/${token}`).then(r=>r.json()).then(d=>{ if(d.error) setError(d.error); else setData(d); setLoading(false) }).catch(()=>{setError("Failed to load"); setLoading(false)})
  },[token])

  const download = async (fileId?: string) => {
    const url = fileId ? `/api/download/${token}/${fileId}${password?`?p=${encodeURIComponent(password)}`:""}` : `/api/download/${token}${password?`?p=${encodeURIComponent(password)}`:""}`
    window.location.href = url
  }

  if (loading) return <div className="p-12 text-center">Loading transfer…</div>
  if (error) return <div className="max-w-lg mx-auto mt-12"><Alert variant="destructive">{error}</Alert></div>
  if (data?.requiresPassword && !data?.unlocked) {
    return (
      <div className="min-h-screen grid place-items-center bg-zinc-50 p-4">
        <Card className="w-full max-w-md"><CardHeader><CardTitle>Password required</CardTitle></CardHeader><CardContent className="space-y-3"><Input type="password" placeholder="Enter password" value={password} onChange={e=>setPassword(e.target.value)} /><Button onClick={()=>{ fetch(`/api/transfers/t/${token}/unlock`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})}).then(r=>r.json()).then(d=>{ if(d.error) setError(d.error); else setData(d) }) }}>Unlock</Button>{error && <Alert variant="destructive">{error}</Alert>}</CardContent></Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card><CardHeader><CardTitle className="text-xl">📦 {data.title || "File transfer"}</CardTitle><p className="text-sm text-muted-foreground">{data.files?.length} files • {formatBytes(data.totalSize||0)} • Expires {new Date(data.expiresAt).toLocaleDateString()} • {data.downloadCount||0} downloads</p></CardHeader>
          <CardContent className="space-y-3">
            {data.files?.map((f:any)=><div key={f.id} className="flex items-center justify-between rounded-xl border p-3 bg-white"><div><p className="text-sm font-medium">{f.filename}</p><p className="text-xs text-muted-foreground">{formatBytes(f.size)} • {f.mimeType}</p></div><Button size="sm" variant="outline" onClick={()=>download(f.id)}>Download</Button></div>)}
            <Button size="lg" className="w-full mt-4" onClick={()=>download()}>Download all {data.files?.length>1?`as zip`:""}</Button>
            {data.message && <div className="rounded-xl bg-secondary p-3 text-sm mt-4">{data.message}</div>}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">Files stored temporarily in Cloudflare R2. Auto-deleted after expiry or download limit. Powered by FileDrop.</p>
      </div>
    </div>
  )
}
