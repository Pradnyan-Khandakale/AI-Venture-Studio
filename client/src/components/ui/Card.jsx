import { cn } from "../../utils/cn";

export function Card({ className, ...props }) {
  return <section className={cn("rounded-lg border border-border bg-card shadow-studio", className)} {...props} />;
}
