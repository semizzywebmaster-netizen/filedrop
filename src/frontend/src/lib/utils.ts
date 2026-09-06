export function cn(...classes: (string|undefined|boolean)[]) { return classes.filter(Boolean).join(" ") }
export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B","KB","MB","GB"]
  const i = Math.floor(Math.log(bytes)/Math.log(k))
  return parseFloat((bytes/Math.pow(k,i)).toFixed(2)) + " " + sizes[i]
}
export function formatDate(d: string|Date) { return new Date(d).toLocaleString() }
export function shortId() { return Math.random().toString(36).slice(2, 9) }
