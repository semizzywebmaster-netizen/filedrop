import { Button } from "@/components/ui/button"
export function Header({ onNav }: { onNav: (p:string)=>void }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-xl dark:bg-zinc-950/80">
      <div className="mx-auto max-w-7xl px-4 md:px-6 h-[64px] flex items-center justify-between">
        <div className="flex items-center gap-8">
          <button onClick={()=>onNav("/")} className="flex items-center gap-2 font-bold text-xl tracking-tight"><span className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center">F</span> FileDrop</button>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <button onClick={()=>onNav("/features")} className="hover:text-foreground">Features</button>
            <button onClick={()=>onNav("/how-it-works")} className="hover:text-foreground">How it works</button>
            <button onClick={()=>onNav("/security")} className="hover:text-foreground">Security</button>
            <button onClick={()=>onNav("/pricing")} className="hover:text-foreground">Pricing</button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={()=>onNav("/login")}>Log in</Button>
          <Button onClick={()=>onNav("/app")}>Start transferring</Button>
        </div>
      </div>
    </header>
  )
}
