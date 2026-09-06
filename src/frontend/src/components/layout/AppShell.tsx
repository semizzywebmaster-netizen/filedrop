import { useState } from "react"
import { Button } from "@/components/ui/button"
export function AppShell({ children, current="dashboard", onNav }: { children: React.ReactNode; current?: string; onNav: (p:string)=>void }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const nav = [
    { id: "dashboard", label: "Dashboard", icon: "◧" },
    { id: "transfers", label: "Transfers", icon: "⇅" },
    { id: "upload", label: "New transfer", icon: "+" },
    { id: "settings", label: "Settings", icon: "⚙" },
  ]
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
      <aside className={`w-[280px] border-r bg-white dark:bg-zinc-900 hidden md:flex flex-col ${mobileOpen?"flex":""}`}>
        <div className="h-[64px] px-6 flex items-center font-bold text-lg gap-2"><span className="h-8 w-8 rounded-lg bg-primary text-white grid place-items-center">F</span> FileDrop</div>
        <nav className="p-4 space-y-1">
          {nav.map(n=><button key={n.id} onClick={()=>onNav(`/app/${n.id}`)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${current===n.id?"bg-primary text-white shadow":"hover:bg-secondary"}`}><span>{n.icon}</span>{n.label}</button>)}
        </nav>
        <div className="mt-auto p-4 border-t"><div className="rounded-xl bg-secondary p-3 text-xs"><p className="font-semibold">Storage</p><p className="text-muted-foreground">2 GB limit for guests</p></div></div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-[64px] border-b bg-white dark:bg-zinc-900 flex items-center justify-between px-4 md:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={()=>setMobileOpen(!mobileOpen)}>☰</Button>
          <div className="text-sm text-muted-foreground">Cloudflare R2 • Encrypted • Auto-expiry</div>
          <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-secondary" /><Button variant="ghost" size="sm" onClick={()=>onNav("/")}>Exit</Button></div>
        </div>
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
