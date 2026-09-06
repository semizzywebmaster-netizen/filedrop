import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatBytes } from "@/lib/utils"

export function Dashboard({ onNav }: { onNav: (p:string)=>void }) {
  const [transfers, setTransfers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(()=>{ fetch("/api/transfers",{credentials:"include"}).then(r=>r.json()).then(d=>{ setTransfers(d.transfers||[]); setLoading(false) }).catch(()=>setLoading(false)) },[])
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Dashboard</h1><Button onClick={()=>onNav("/app/upload")}>New transfer</Button></div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><div className="text-2xl font-bold">{transfers.length}</div><div className="text-xs text-muted-foreground">Total transfers</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-2xl font-bold">{transfers.reduce((a,b)=>a+(b.downloadCount||0),0)}</div><div className="text-xs text-muted-foreground">Downloads</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-2xl font-bold">{formatBytes(transfers.reduce((a,b)=>a+(b.totalSize||0),0))}</div><div className="text-xs text-muted-foreground">Stored (temp)</div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Recent transfers</CardTitle></CardHeader><CardContent className="space-y-2">
        {loading? <div>Loading…</div> : transfers.length===0? <div className="text-sm text-muted-foreground py-8 text-center">No transfers yet. Create your first.<br/><Button size="sm" className="mt-3" onClick={()=>onNav("/app/upload")}>New transfer</Button></div> : transfers.map((t:any)=><div key={t.id} className="flex items-center justify-between rounded-xl border p-3 hover:bg-secondary/50"><div className="min-w-0"><p className="text-sm font-medium truncate">{t.token} • {t.filesCount} files</p><p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()} • {formatBytes(t.totalSize)} • <Badge variant={t.status==="active"?"success":"secondary"}>{t.status}</Badge></p></div><Button size="sm" variant="outline" onClick={()=>navigator.clipboard.writeText(`${location.origin}/d/${t.token}`)}>Copy link</Button></div>)}
      </CardContent></Card>
    </div>
  )
}
