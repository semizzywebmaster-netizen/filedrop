import * as React from "react"
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "outline" | "destructive"
  size?: "sm" | "default" | "lg" | "icon"
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className="", variant="default", size="default", ...props }, ref) => {
  const base = "inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none"
  const variants: Record<string,string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    outline: "border border-input bg-background hover:bg-accent",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
  }
  const sizes: Record<string,string> = {
    sm: "h-9 px-4 text-sm",
    default: "h-11 px-6 py-2",
    lg: "h-12 px-8 text-base",
    icon: "h-10 w-10"
  }
  return <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
})
Button.displayName = "Button"
