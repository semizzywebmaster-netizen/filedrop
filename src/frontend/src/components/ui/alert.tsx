export function Alert({ children, variant="default", className="" }: { children: React.ReactNode; variant?: "default"|"destructive"|"success"; className?: string }) {
  const styles: Record<string,string> = {
    default: "bg-secondary text-secondary-foreground border",
    destructive: "bg-destructive/10 text-destructive border-destructive/20 border",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200 border dark:bg-emerald-950 dark:text-emerald-200"
  }
  return <div className={`rounded-xl p-4 text-sm ${styles[variant]} ${className}`}>{children}</div>
}
