export function Badge({ className="", variant="default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default"|"secondary"|"outline"|"success"|"warning" }) {
  const map: Record<string,string> = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    outline: "border",
    success: "bg-emerald-500 text-white",
    warning: "bg-amber-500 text-white"
  }
  return <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[variant]} ${className}`} {...props} />
}
