import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatBytes } from "@/lib/utils"

type Tab = "overview" | "users" | "transfers" | "files" | "security" | "settings" | "logs"

type AdminData = Record<string, any>

async function getJSON(path: string, options: RequestInit = {}) {
  const response = await fetch(path, { ...options, credentials: "include" })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || "Request failed")
  return data
}

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview")
  const [data, setData] = useState<AdminData>({})
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = async (nextTab: Tab = tab) => {
    setLoading(true)
    setError("")
    try {
      let result: AdminData
      if (nextTab === "overview") result = await getJSON("/api/admin/stats")
      else if (nextTab === "users") result = await getJSON(`/api/admin/users?q=${encodeURIComponent(query)}`)
      else if (nextTab === "transfers") result = await getJSON(`/api/admin/transfers?status=all&q=${encodeURIComponent(query)}`)
      else if (nextTab === "files") result = await getJSON("/api/admin/files")
      else if (nextTab === "security") result = await getJSON("/api/admin/abuse/reports")
      else if (nextTab === "settings") result = await getJSON("/api/admin/settings")
      else result = await getJSON("/api/admin/logs")
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load admin data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(tab) }, [tab, query])

  const action = async (path: string, body?: unknown, method = "POST") => {
    try {
      await getJSON(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      })
      await load(tab)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed")
    }
  }

  const stats = data.totals || {}
  const users = data.users || []
  const transfers = data.transfers || []
  const files = data.files || []
  const reports = data.reports || []
  const settings = data.settings || []
  const flags = data.flags || []
  const logs = data.logs || []

  if (loading && !Object.keys(data).length) return <div className="p-8">Loading admin…</div>

  if (error && !Object.keys(data).length) return (
    <div className="max-w-lg mx-auto mt-20 p-6 rounded-2xl border bg-white space-y-4">
      <div><h2 className="font-bold text-lg">Admin access required</h2><p className="text-sm text-muted-foreground mt-2">{error}</p></div>
      <div className="flex gap-2"><Button onClick={() => void action("/api/admin/bootstrap")}>Make me admin</Button><Button variant="outline" onClick={() => { location.href = "/" }}>Home</Button></div>
      <p className="text-xs text-muted-foreground">Bootstrap is only available when no administrator exists.</p>
    </div>
  )

  const tabs: Array<[Tab, string]> = [["overview", "Overview"], ["users", "Users"], ["transfers", "Transfers"], ["files", "Files"], ["security", "Abuse & Security"], ["settings", "System & Flags"], ["logs", "Audit Logs"]]

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b bg-white dark:bg-zinc-900 sticky top-0 z-30">
        <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-zinc-900 text-white grid place-items-center font-bold">A</div><span className="font-bold">FileDrop Admin</span><Badge variant="success">Workers • D1 • R2</Badge></div>
          <div className="flex gap-2"><Input placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} className="w-56"/><Button variant="outline" size="sm" onClick={() => { location.href = "/app" }}>Exit</Button></div>
        </div>
        <nav className="mx-auto max-w-[1600px] px-4 md:px-6 pb-3 flex gap-1 overflow-x-auto">
          {tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${tab === id ? "bg-zinc-900 text-white" : "hover:bg-secondary"}`}>{label}</button>)}
        </nav>
      </header>

      <main className="mx-auto max-w-[1600px] p-4 md:p-6 space-y-6">
        {error && <div className="border rounded-xl p-3 text-sm text-destructive bg-white">{error}</div>}
        {tab === "overview" && <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[['Users', stats.users], ['Active transfers', stats.transfersActive], ['Files', stats.files], ['Storage', formatBytes(stats.storageBytes || 0)], ['Downloads', stats.downloads], ['Expired', stats.transfersExpired], ['Open abuse', stats.abuseOpen]].map(([label, value]) => <Card key={String(label)}><CardContent className="p-4"><div className="text-xl font-bold">{value ?? 0}</div><div className="text-xs text-muted-foreground">{label}</div></CardContent></Card>)}
          </div>
          <div className="grid lg:grid-cols-2 gap-6"><Card><CardHeader><CardTitle>Recent transfers</CardTitle></CardHeader><CardContent className="space-y-2">{(data.recentTransfers || []).map((t: any) => <div key={t.id} className="border rounded-xl p-3 flex justify-between gap-3"><span className="font-mono text-sm truncate">{t.token} · {formatBytes(t.total_size || 0)}</span><Badge variant={t.status === "active" ? "success" : "secondary"}>{t.status}</Badge></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Recent users</CardTitle></CardHeader><CardContent className="space-y-2">{(data.recentUsers || []).map((u: any) => <div key={u.id} className="border rounded-xl p-3 flex justify-between gap-3 text-sm"><span>{u.email}</span><span className="text-muted-foreground">{u.is_admin ? "ADMIN" : "USER"}</span></div>)}</CardContent></Card></div>
        </>}

        {tab === "users" && <Card><CardHeader><CardTitle>Users · {users.length}</CardTitle></CardHeader><CardContent className="space-y-2">{users.map((u: any) => <div key={u.id} className="border rounded-xl p-3 flex flex-wrap justify-between gap-3"><div><div className="font-medium">{u.email} {u.is_admin && <Badge variant="success">admin</Badge>} {u.banned_at && <Badge variant="secondary">banned</Badge>}</div><div className="text-xs text-muted-foreground">{u.name || ""}</div></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void action(`/api/admin/users/${u.id}/toggle-admin`)}>{u.is_admin ? "Remove admin" : "Make admin"}</Button><Button size="sm" variant="outline" onClick={() => void action(`/api/admin/users/${u.id}/ban`, { banned: !u.banned_at })}>{u.banned_at ? "Unban" : "Ban"}</Button><Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete user?")) void action(`/api/admin/users/${u.id}`, undefined, "DELETE") }}>Delete</Button></div></div>)}</CardContent></Card>}

        {tab === "transfers" && <Card><CardHeader><CardTitle>Transfers · {transfers.length}</CardTitle></CardHeader><CardContent className="space-y-2">{transfers.map((t: any) => <div key={t.id} className="border rounded-xl p-3 flex flex-wrap justify-between gap-3"><div className="min-w-0"><div className="font-mono text-sm truncate">{t.token} · {t.title || "Untitled"} · {formatBytes(t.total_size || 0)}</div><div className="text-xs text-muted-foreground">{t.owner_email || "guest"} · {t.files_count || 0} files · {t.download_count || 0} downloads</div></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(`${location.origin}/d/${t.token}`)}>Copy link</Button><Button size="sm" variant="outline" onClick={() => void action(`/api/admin/transfers/${t.id}/expire`)}>Expire</Button><Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete transfer and files?")) void action(`/api/admin/transfers/${t.id}`, undefined, "DELETE") }}>Delete</Button></div></div>)}</CardContent></Card>}

        {tab === "files" && <Card><CardHeader><CardTitle>Files · {files.length}</CardTitle></CardHeader><CardContent className="space-y-2">{files.map((f: any) => <div key={f.id} className="border rounded-xl p-3 text-sm flex justify-between gap-3"><span className="truncate">{f.original_name} · {formatBytes(f.size || 0)} · {f.mime_type || "unknown"}</span><span className="font-mono text-xs">{f.status}</span></div>)}</CardContent></Card>}

        {tab === "security" && <Card><CardHeader><CardTitle>Abuse reports</CardTitle></CardHeader><CardContent className="space-y-2">{reports.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No reports</div> : reports.map((r: any) => <div key={r.id} className="border rounded-xl p-3 flex justify-between gap-3"><div><div className="font-medium">{r.reason} · {r.status}</div><div className="text-xs text-muted-foreground">{r.details || "No details"}</div></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void action(`/api/admin/abuse/reports/${r.id}/status`, { status: "resolved" })}>Resolve</Button><Button size="sm" variant="outline" onClick={() => void action(`/api/admin/abuse/reports/${r.id}/status`, { status: "dismissed" })}>Dismiss</Button></div></div>)}</CardContent></Card>}

        {tab === "settings" && <div className="grid lg:grid-cols-2 gap-6"><Card><CardHeader><CardTitle>System settings</CardTitle></CardHeader><CardContent className="space-y-3">{settings.map((s: any) => <SettingRow key={s.key} setting={s} onSave={(value: string) => void action("/api/admin/settings", { key: s.key, value })}/>)}</CardContent></Card><Card><CardHeader><CardTitle>Feature flags</CardTitle></CardHeader><CardContent className="space-y-2">{flags.map((f: any) => <div key={f.key} className="flex justify-between items-center border rounded-xl p-3"><span className="font-mono text-sm">{f.key}</span><Button size="sm" variant={f.enabled ? "default" : "outline"} onClick={() => void action("/api/admin/flags", { key: f.key, enabled: !f.enabled })}>{f.enabled ? "Enabled" : "Disabled"}</Button></div>)}</CardContent></Card></div>}

        {tab === "logs" && <Card><CardHeader><CardTitle>Audit logs · {logs.length}</CardTitle></CardHeader><CardContent className="space-y-2">{logs.map((l: any) => <div key={l.id} className="border rounded-xl p-3 text-sm"><div className="font-medium">{l.action || l.event || "Admin event"}</div><div className="text-xs text-muted-foreground">{l.ip || ""} · {l.created_at ? new Date(l.created_at * 1000).toLocaleString() : ""}</div></div>)}</CardContent></Card>}
      </main>
    </div>
  )
}

function SettingRow({ setting, onSave }: { setting: any; onSave: (value: string) => void }) {
  const [value, setValue] = useState(String(setting.value ?? ""))
  return <div className="flex gap-2 items-center"><span className="text-xs font-mono w-48 truncate">{setting.key}</span><Input value={value} onChange={e => setValue(e.target.value)} className="h-8"/><Button size="sm" onClick={() => onSave(value)}>Save</Button></div>
}
