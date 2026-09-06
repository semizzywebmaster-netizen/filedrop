import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function TransferSettings({ onChange }: { onChange: (s:any)=>void }) {
  const [expiry, setExpiry] = useState("7")
  const [password, setPassword] = useState("")
  const [maxDownloads, setMaxDownloads] = useState("")
  const [emailTo, setEmailTo] = useState("")
  const [message, setMessage] = useState("")
  const push = () => onChange({ expiryDays: parseInt(expiry)||7, password: password||undefined, maxDownloads: maxDownloads?parseInt(maxDownloads):undefined, emailTo: emailTo||undefined, message: message||undefined })
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Transfer settings</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium">Expires after</label><select value={expiry} onChange={e=>{setExpiry(e.target.value); setTimeout(push,0)}} className="w-full h-11 rounded-xl border px-3 text-sm"><option value="1">1 day</option><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></div>
          <div><label className="text-xs font-medium">Download limit (optional)</label><Input placeholder="e.g. 10" value={maxDownloads} onChange={e=>{setMaxDownloads(e.target.value); setTimeout(push,0)}} /></div>
        </div>
        <div><label className="text-xs font-medium">Password protect (optional)</label><Input type="password" placeholder="Set a password" value={password} onChange={e=>{setPassword(e.target.value); setTimeout(push,0)}} /></div>
        <div><label className="text-xs font-medium">Send to email (optional)</label><Input placeholder="recipient@example.com" value={emailTo} onChange={e=>{setEmailTo(e.target.value); setTimeout(push,0)}} /></div>
        <div><label className="text-xs font-medium">Message (optional)</label><textarea className="w-full rounded-xl border p-3 text-sm min-h-[80px]" placeholder="Add a message..." value={message} onChange={e=>{setMessage(e.target.value); setTimeout(push,0)}} /></div>
      </CardContent>
    </Card>
  )
}
