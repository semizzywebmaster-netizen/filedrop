import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"

export function LoginPage({ onNav }: { onNav: (p:string)=>void }) {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false)
  const submit = async (e: React.FormEvent)=>{ e.preventDefault(); setLoading(true); setError(""); try{ const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({email,password})}); const d=await r.json(); if(!r.ok) throw new Error(d.error); onNav("/app") }catch(err:any){setError(err.message)} finally{setLoading(false)} }
  return (
    <div className="min-h-screen grid place-items-center bg-zinc-50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Welcome back</CardTitle><p className="text-sm text-muted-foreground">Log in to FileDrop</p></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><Input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required /><Input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />{error && <Alert variant="destructive">{error}</Alert>}<Button className="w-full" disabled={loading}>{loading?"Logging in…":"Log in"}</Button><p className="text-xs text-center">No account? <button type="button" className="text-primary underline" onClick={()=>onNav("/register")}>Register</button></p></form></CardContent></Card></div>
  )
}
export function RegisterPage({ onNav }: { onNav: (p:string)=>void }) {
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false)
  const submit = async (e: React.FormEvent)=>{ e.preventDefault(); setLoading(true); setError(""); try{ const r=await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({name,email,password})}); const d=await r.json(); if(!r.ok) throw new Error(d.error); onNav("/app") }catch(err:any){setError(err.message)} finally{setLoading(false)} }
  return (
    <div className="min-h-screen grid place-items-center bg-zinc-50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Create account</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><Input placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required /><Input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required /><Input placeholder="Password (min 8)" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />{error && <Alert variant="destructive">{error}</Alert>}<Button className="w-full" disabled={loading}>{loading?"Creating…":"Create account"}</Button><p className="text-xs text-center">Have account? <button type="button" className="text-primary underline" onClick={()=>onNav("/login")}>Log in</button></p></form></CardContent></Card></div>
  )
}
