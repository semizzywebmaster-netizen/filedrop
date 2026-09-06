export function Progress({ value=0, className="" }: { value?: number; className?: string }) {
  return <div className={`w-full h-2 rounded-full bg-secondary overflow-hidden ${className}`}><div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
}
