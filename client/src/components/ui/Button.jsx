import { cn } from "../../utils/cn";

export function Button({ className, variant = "primary", size = "md", ...props }) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-teal-800",
    secondary: "bg-white text-foreground border border-border hover:bg-muted",
    ghost: "text-foreground hover:bg-muted",
    danger: "bg-rose-600 text-white hover:bg-rose-700"
  };
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    icon: "h-10 w-10"
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
