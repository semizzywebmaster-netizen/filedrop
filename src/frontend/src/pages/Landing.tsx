import { Header } from "@/components/layout/Header"
import { DropZone } from "@/components/upload/DropZone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

export function Landing({ onNav }: { onNav: (p:string)=>void }) {
  const [files, setFiles] = useState<File[]>([])
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Header onNav={onNav} />
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="success">Cloudflare R2 • No size tricks • Encrypted</Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">Upload your files.<br/>Get a link.<br/><span className="text-primary">Share it anywhere.</span></h1>
            <p className="text-lg text-muted-foreground">Professional file transfer without the bloat. Secure temporary storage on Cloudflare R2. Auto-expires. Download limits. Password protection.</p>
            <div className="flex gap-3"><Button size="lg" onClick={()=>onNav("/app/upload")}>Start transferring — free</Button><Button size="lg" variant="outline" onClick={()=>onNav("/how-it-works")}>How it works</Button></div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground pt-2">
              <span>✓ No account required</span><span>✓ 2GB files</span><span>✓ GDPR ready</span>
            </div>
          </div>
          <Card className="p-4 md:p-6 shadow-2xl shadow-zinc-200/50">
            <DropZone onFiles={f=>{setFiles(f); onNav("/app/upload")}} />
            {files.length>0 && <div className="mt-4 text-sm">{files.length} files ready</div>}
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-xl bg-secondary p-3"><div className="font-bold text-sm">7 days</div>Default expiry</div>
              <div className="rounded-xl bg-secondary p-3"><div className="font-bold text-sm">AES-256</div>At rest</div>
              <div className="rounded-xl bg-secondary p-3"><div className="font-bold text-sm">R2</div>Edge storage</div>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y bg-zinc-50 dark:bg-zinc-900/50 py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6 grid md:grid-cols-3 gap-8">
          {[
            { t: "Chunked & Resumable", d: "5MB chunks, auto-retry, handles interrupted connections and 2GB+ files without buffering through Workers." },
            { t: "Secure by design", d: "Cryptographically random tokens (not sequential IDs), bcrypt passwords, httpOnly JWT, Turnstile anti-abuse." },
            { t: "Auto-cleanup", d: "Transfers expire by time or download count. Cron every 6h deletes R2 objects + D1 rows. No permanent asset bloat." }
          ].map(f=>(
            <Card key={f.t}><CardContent className="p-6"><h3 className="font-semibold mb-2">{f.t}</h3><p className="text-sm text-muted-foreground">{f.d}</p></CardContent></Card>
          ))}
        </div>
      </section>

      <section className="py-16 mx-auto max-w-7xl px-4 md:px-6">
        <h2 className="text-2xl font-bold mb-8">Flow</h2>
        <div className="grid md:grid-cols-6 gap-4 text-sm">
          {["Upload","Temporary R2","Secure Link","Share","Download","Auto-delete"].map((s,i)=><div key={s} className="rounded-2xl border p-4 bg-white"><div className="h-8 w-8 rounded-full bg-primary text-white grid place-items-center text-xs mb-3">{i+1}</div><div className="font-medium">{s}</div></div>)}
        </div>
      </section>

      <footer className="border-t py-12 text-sm text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 md:px-6 flex flex-wrap gap-8">
          <div>© 2026 FileDrop. Cloudflare-first.</div>
          <button onClick={()=>onNav("/privacy")}>Privacy</button><button onClick={()=>onNav("/terms")}>Terms</button><button onClick={()=>onNav("/security")}>Security</button>
        </div>
      </footer>
    </div>
  )
}
