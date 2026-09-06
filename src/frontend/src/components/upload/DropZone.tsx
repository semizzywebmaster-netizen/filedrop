import { useState, useCallback } from "react"
import { formatBytes } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"

type FileItem = { file: File; id: string; progress: number; status: "queued"|"uploading"|"done"|"error" }

export function DropZone({ onFiles, maxFiles=50 }: { onFiles: (files: File[])=>void; maxFiles?: number }) {
  const [dragOver, setDragOver] = useState(false)
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const files = Array.from(e.dataTransfer.files).slice(0, maxFiles)
    if (files.length) onFiles(files)
  }, [onFiles, maxFiles])
  return (
    <div onDragOver={e=>{e.preventDefault(); setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
      className={`group relative rounded-[24px] border-2 border-dashed p-8 md:p-12 text-center transition-all ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50"}`}>
      <div className="mx-auto max-w-md space-y-4">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl">⬆️</div>
        <h3 className="text-xl font-semibold">Drop files here</h3>
        <p className="text-sm text-muted-foreground">or click to browse • Up to {maxFiles} files • 2GB per file</p>
        <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e=>{ if(e.target.files) onFiles(Array.from(e.target.files).slice(0,maxFiles)) }} />
        <Button variant="outline" className="mt-2 pointer-events-none">Browse files</Button>
      </div>
    </div>
  )
}

export function FileQueue({ files, onRemove }: { files: File[]; onRemove: (i:number)=>void }) {
  return (
    <div className="space-y-2">
      {files.map((f,i)=>(
        <Card key={i} className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-sm">📄</div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate max-w-[180px] md:max-w-[320px]">{f.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(f.size)} • {f.type || "file"}</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={()=>onRemove(i)}>✕</Button>
        </Card>
      ))}
    </div>
  )
}
