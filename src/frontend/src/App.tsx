import { useState, useEffect } from "react"
import { Landing } from "./pages/Landing"
import { UploadPage } from "./pages/UploadPage"
import { DownloadPage } from "./pages/DownloadPage"
import { Dashboard } from "./pages/Dashboard"
import { LoginPage, RegisterPage } from "./pages/AuthPages"
import { SecurityPage, FeaturesPage, HowItWorksPage, PrivacyPage, TermsPage } from "./pages/StaticPages"
import { AppShell } from "./components/layout/AppShell"

function useRouter() {
  const [path, setPath] = useState(location.pathname + location.search)
  useEffect(()=>{
    const onPop = () => setPath(location.pathname + location.search)
    window.addEventListener("popstate", onPop)
    return ()=>window.removeEventListener("popstate", onPop)
  },[])
  const nav = (p:string) => { history.pushState({}, "", p); setPath(p) }
  return { path, nav }
}

export default function App() {
  const { path, nav } = useRouter()
  const clean = path.split("?")[0]

  if (clean.startsWith("/d/")) {
    const token = clean.replace("/d/","").split("/")[0]
    return <DownloadPage token={token} />
  }
  if (clean.startsWith("/app")) {
    const sub = clean.replace("/app","") || "/dashboard"
    if (sub.startsWith("/upload")) return <AppShell current="upload" onNav={nav}><UploadPage /></AppShell>
    if (sub.startsWith("/transfers")) return <AppShell current="transfers" onNav={nav}><Dashboard onNav={nav} /></AppShell>
    if (sub.startsWith("/settings")) return <AppShell current="settings" onNav={nav}><div className="space-y-4"><h1 className="text-xl font-bold">Settings</h1><p className="text-sm text-muted-foreground">Profile, avatar, security, delete account coming from /api/me</p></div></AppShell>
    return <AppShell current="dashboard" onNav={nav}><Dashboard onNav={nav} /></AppShell>
  }
  if (clean==="/login") return <LoginPage onNav={nav} />
  if (clean==="/register") return <RegisterPage onNav={nav} />
  if (clean==="/security") return <SecurityPage onNav={nav} />
  if (clean==="/features") return <FeaturesPage onNav={nav} />
  if (clean==="/how-it-works") return <HowItWorksPage onNav={nav} />
  if (clean==="/privacy") return <PrivacyPage onNav={nav} />
  if (clean==="/terms") return <TermsPage onNav={nav} />
  if (clean==="/pricing") return <FeaturesPage onNav={nav} />

  return <Landing onNav={nav} />
}
