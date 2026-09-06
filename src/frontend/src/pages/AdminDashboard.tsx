import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatBytes } from "@/lib/utils"

type Tab = "overview"|"users"|"transfers"|"files"|"security"|"settings"|"storage"|"logs"

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview")
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [transfers, setTransfers] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [settings, setSettings] = useState<any[]>([])
  const [flags, setFlags] = useState<any[]>([])
  const [abuse, setAbuse] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats", { credentials: "include" })
      if (!res.ok) { const e=await res.json(); throw new Error(e.error) }
      setStats(await res.json())
    } catch (e:any) { setError(e.message) }
    setLoading(false)
  }
  const fetchUsers = async () => { const r=await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`,{credentials:"include"}); const d=await r.json(); setUsers(d.users||[]) }
  const fetchTransfers = async () => { const r=await fetch(`/api/admin/transfers?status=all&q=${encodeURIComponent(q)}`,{credentials:"include"}); const d=await r.json(); setTransfers(d.transfers||[]) }
  const fetchFiles = async () => { const r=await fetch("/api/admin/files",{credentials:"include"}); const d=await r.json(); setFiles(d.files||[]) }
  const fetchSettings = async () => { const r=await fetch("/api/admin/settings",{credentials:"include"}); const d=await r.json(); setSettings(d.settings||[]); setFlags(d.flags||[]) }
  const fetchAbuse = async () => { const r=await fetch("/api/admin/abuse/reports",{credentials:"include"}); const d=await r.json(); setAbuse(d.reports||[]) }
  const fetchLogs = async () => { const r=await fetch("/api/admin/logs",{credentials:"include"}); const d=await r.json(); setLogs(d.logs||[]) }

  useEffect(()=>{ fetchStats(); },[])
  useEffect(()=>{
    if(tab==="users") fetchUsers()
    if(tab==="transfers") fetchTransfers()
    if(tab==="files") fetchFiles()
    if(tab==="settings") fetchSettings()
    if(tab==="security") fetchAbuse()
    if(tab==="logs") fetchLogs()
  },[tab, q])

  const updateSetting = async (key:string, value:string) => {
    await fetch("/api/admin/settings",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({key,value})})
    fetchSettings()
  }
  const toggleFlag = async (key:string, enabled:boolean) => {
    await fetch("/api/admin/flags",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({key, enabled})})
    fetchSettings()
  }

  if (loading) return <div className="p-8">Loading admin…</div>
  if (error) return (
    <div className="max-w-lg mx-auto mt-20 p-6 rounded-2xl border bg-white">
      <h2 className="font-bold text-lg">Admin access required</h2>
      <p className="text-sm text-muted-foreground mt-2">{error}</p>
      <div className="mt-4 flex gap-2">
        <Button onClick={async()=>{ const r=await fetch("/api/admin/bootstrap",{method:"POST",credentials:"include"}); const d=await r.json(); if(d.ok){ location.reload() } else { setError(d.error) } }}>Make me admin (bootstrap first admin)</Button>
        <Button variant="outline" onClick={()=>location.href="/"}>Home</Button>
      </div>
      <p className="text-xs text-muted-foreground mt-4">First user to bootstrap becomes admin. After that, admin count >0 blocks bootstrap.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="border-b bg-white dark:bg-zinc-900 sticky top-0 z-30">
        <div className="mx-auto max-w-[1600px] px-4 md:px-6 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-bold text-lg"><span className="h-8 w-8 rounded-lg bg-zinc-900 text-white grid place-items-center dark:bg-white dark:text-black">A</span> FileDrop Admin</div>
            <Badge variant="success">Cloudflare R2 • D1 • Workers</Badge>
          </div>
          <div className="flex items-center gap-2"><Input placeholder="Search users, transfers…" value={q} onChange={e=>setQ(e.target.value)} className="w-[260px] hidden md:flex" /><Button variant="outline" size="sm" onClick={()=>location.href="/app"}>Exit admin</Button></div>
        </div>
        <div className="mx-auto max-w-[1600px] px-4 md:px-6 flex gap-1 overflow-auto py-2">
          {[
            {id:"overview", label:"Overview"},
            {id:"users", label:"Users"},
            {id:"transfers", label:"Transfers"},
            {id:"files", label:"Files"},
            {id:"security", label:"Abuse & Security"},
            {id:"storage", label:"Storage"},
            {id:"settings", label:"System & Flags"},
            {id:"logs", label:"Audit Logs"},
          ].map(t=><button key={t.id} onClick={()=>setTab(t.id as any)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${tab===t.id?"bg-zinc-900 text-white dark:bg-white dark:text-black":"hover:bg-secondary"}`}>{t.label}</button>)}
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] p-4 md:p-6 space-y-6">
        {tab==="overview" && stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <Card><CardContent className="p-4"><div className="text-2xl font-bold">{stats.totals.users}</div><div className="text-xs text-muted-foreground">Users (+{stats.totals.usersWeek} this week)</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-2xl font-bold">{stats.totals.transfersActive}</div><div className="text-xs text-muted-foreground">Active transfers</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-2xl font-bold">{stats.totals.files}</div><div className="text-xs text-muted-foreground">Files stored</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-2xl font-bold">{formatBytes(stats.totals.storageBytes)}</div><div className="text-xs text-muted-foreground">Storage used</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-2xl font-bold">{stats.totals.downloads}</div><div className="text-xs text-muted-foreground">Downloads</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-2xl font-bold">{stats.totals.downloadsDay}</div><div className="text-xs text-muted-foreground">DL today</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-2xl font-bold">{stats.totals.transfersExpired}</div><div className="text-xs text-muted-foreground">Expired</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-2xl font-bold">{stats.totals.abuseOpen}</div><div className="text-xs text-muted-foreground">Abuse open</div></CardContent></Card>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <Card><CardHeader><CardTitle className="text-base">Recent transfers</CardTitle></CardHeader><CardContent className="space-y-2">{stats.recentTransfers.map((t:any)=><div key={t.id} className="flex justify-between text-sm border rounded-xl p-2.5"><span className="font-mono truncate">{t.token} • {formatBytes(t.total_size||0)}</span><Badge variant={t.status==="active"?"success":"secondary"}>{t.status}</Badge></div>)}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Recent users</CardTitle></CardHeader><CardContent className="space-y-2">{stats.recentUsers.map((u:any)=><div key={u.id} className="flex justify-between text-sm border rounded-xl p-2.5"><span>{u.email}</span><span className="text-xs text-muted-foreground">{new Date(u.created_at*1000).toLocaleDateString()} {u.is_admin?"• ADMIN":""}</span></div>)}</CardContent></Card>
            </div>
            <Card><CardContent className="p-4 text-xs text-muted-foreground">Storage principle: R2 objects auto-expire via Cron every 6h. D1 rows cleaned >30d. Tokens are cryptographically random, never sequential. All downloads streamed, never buffered.</CardContent></Card>
          </>
        )}

        {tab==="users" && (
          <Card><CardHeader><CardTitle>Users — {users.length}</CardTitle></CardHeader><CardContent className="space-y-2">
            {users.map((u:any)=><div key={u.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-xl p-3">
              <div><div className="font-medium text-sm">{u.email} {u.is_admin?<Badge variant="success">admin</Badge>:null} {u.banned_at?<Badge variant="secondary">banned</Badge>:null}</div><div className="text-xs text-muted-foreground">{u.name} • {new Date(u.created_at*1000).toLocaleString()}</div></div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={async()=>{ await fetch(`/api/admin/users/${u.id}/toggle-admin`,{method:"POST",credentials:"include"}); fetchUsers() }}>{u.is_admin?"Remove admin":"Make admin"}</Button>
                <Button size="sm" variant="outline" onClick={async()=>{ await fetch(`/api/admin/users/${u.id}/ban`,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({banned:!u.banned_at})}); fetchUsers() }}>{u.banned_at?"Unban":"Ban"}</Button>
                <Button size="sm" variant="ghost" onClick={async()=>{ if(confirm("Delete user?")){ await fetch(`/api/admin/users/${u.id}`,{method:"DELETE",credentials:"include"}); fetchUsers() } }}>Delete</Button>
              </div>
            </div>)}
          </CardContent></Card>
        )}

        {tab==="transfers" && (
          <Card><CardHeader><CardTitle>Transfers — {transfers.length}</CardTitle></CardHeader><CardContent className="space-y-2">
            {transfers.map((t:any)=><div key={t.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-xl p-3">
              <div className="min-w-0"><div className="font-mono text-sm truncate">{t.token} • {t.title||"Untitled"} • {formatBytes(t.total_size||0)} • {t.files_count}f • {t.download_count} DL</div><div className="text-xs text-muted-foreground">{t.owner_email||"guest"} • {new Date(t.created_at*1000).toLocaleString()} • expires {new Date(t.expires_at*1000).toLocaleDateString()} • <Badge variant={t.status==="active"?"success":"secondary"}>{t.status}</Badge></div></div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={()=>navigator.clipboard.writeText(`${location.origin}/d/${t.token}`)}>Copy link</Button>
                <Button size="sm" variant="outline" onClick={async()=>{ await fetch(`/api/admin/transfers/${t.id}/expire`,{method:"POST",credentials:"include"}); fetchTransfers() }}>Expire</Button>
                <Button size="sm" variant="destructive" onClick={async()=>{ if(confirm("Delete transfer + R2 files?")){ await fetch(`/api/admin/transfers/${t.id}`,{method:"DELETE",credentials:"include"}); fetchTransfers() } }}>Delete</Button>
              </div>
            </div>)}
          </CardContent></Card>
        )}

        {tab==="files" && (
          <Card><CardHeader><CardTitle>Files — {files.length} (sample 100)</CardTitle></CardHeader><CardContent className="space-y-2">
            {files.map((f:any)=><div key={f.id} className="flex justify-between text-sm border rounded-xl p-2.5"><span className="truncate">{f.original_name} • {formatBytes(f.size)} • {f.mime_type} • {f.status}</span><span className="font-mono text-xs">{f.token}</span></div>)}
          </CardContent></Card>
        )}

        {tab==="security" && (
          <Card><CardHeader><CardTitle>Abuse Reports</CardTitle></CardHeader><CardContent className="space-y-2">
            {abuse.length===0? <div className="text-sm text-muted-foreground py-8 text-center">No reports</div> : abuse.map((a:any)=><div key={a.id} className="border rounded-xl p-3 flex justify-between gap-2"><div><div className="font-medium text-sm">{a.reason} • {a.status}</div><div className="text-xs text-muted-foreground">{a.details||"—"} • {a.token||a.transfer_id} • {new Date(a.created_at*1000).toLocaleString()}</div></div><div className="flex gap-1"><Button size="sm" variant="outline" onClick={async()=>{ await fetch(`/api/admin/abuse/reports/${a.id}/status`,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({status:"resolved"})}); fetchAbuse() }}>Resolve</Button><Button size="sm" variant="outline" onClick={async()=>{ await fetch(`/api/admin/abuse/reports/${a.id}/status`,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({status:"dismissed"})}); fetchAbuse() }}>Dismiss</Button></div></div>)}
          </CardContent></Card>
        )}

        {tab==="settings" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-base">System Settings (controls all features)</CardTitle></CardHeader><CardContent className="space-y-3">
              {settings.map((s:any)=><div key={s.key} className="flex gap-2 items-center"><span className="text-xs font-mono w-[220px] truncate">{s.key}</span><Input defaultValue={s.value} id={`set-${s.key}`} className="h-8 text-sm" /><Button size="sm" onClick={()=>{ const el=document.getElementById(`set-${s.key}`) as HTMLInputElement; updateSetting(s.key, el.value) }}>Save</Button></div>)}
              <div className="pt-4 border-t space-y-2">
                <div className="text-xs font-semibold">Add new setting</div>
                <div className="flex gap-2"><Input placeholder="key" id="new-key" className="h-8"/><Input placeholder="value" id="new-val" className="h-8"/><Button size="sm" onClick={()=>{ const k=(document.getElementById("new-key") as HTMLInputElement).value; const v=(document.getElementById("new-val") as HTMLInputElement).value; if(k) updateSetting(k,v) }}>Add</Button></div>
              </div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Feature Flags</CardTitle></CardHeader><CardContent className="space-y-3">
              {flags.map((f:any)=><div key={f.key} className="flex items-center justify-between border rounded-xl p-3"><div><div className="font-medium text-sm">{f.key} {f.enabled?<Badge variant="success">on</Badge>:<Badge variant="secondary">off</Badge>}</div><div className="text-xs text-muted-foreground">{f.config||"{}"}</div></div><Button size="sm" variant={f.enabled?"destructive":"default"} onClick={()=>toggleFlag(f.key, !f.enabled)}>{f.enabled?"Disable":"Enable"}</Button></div>)}
              <div className="text-xs text-muted-foreground pt-2">Flags control: guest_uploads, password_protection, email_sharing, api_access, turnstile, registration, maintenance_mode. Disabling instantly blocks that feature in API middleware (implement check in routes).</div>
            </CardContent></Card>
          </div>
        )}

        {tab==="storage" && (
          <Card><CardHeader><CardTitle>Storage Overview</CardTitle></CardHeader><CardContent><Button size="sm" onClick={async()=>{ const r=await fetch("/api/admin/storage",{credentials:"include"}); const d=await r.json(); alert(JSON.stringify(d,null,2)) }}>Refresh R2 + D1 stats</Button><div className="mt-4 text-xs text-muted-foreground">R2 bucket: filedrop-transfers, filedrop-previews. Cron deletes expired every 6h. Sample list limited to 1000 objects per call to avoid Worker limits.</div></CardContent></Card>
        )}

        {tab==="logs" && (
          <Card><CardHeader><CardTitle>Audit Logs — last 100</CardTitle></CardHeader><CardContent className="space-y-2">{logs.map((l:any)=><div key={l.id} className="flex justify-between text-xs border rounded-xl p-2.5"><span>{new Date(l.created_at*1000).toLocaleString()} • {l.admin_email} • {l.action} • {l.target_type}/{l.target_id}</span><span className="truncate max-w-[200px]">{l.details||""}</span></div>)}</CardContent></Card>
        )}
      </div>
    </div>
  )
}
