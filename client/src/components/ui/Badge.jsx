import { cn } from "../../utils/cn";

const toneMap = {
  pending: "bg-slate-100 text-slate-700",
  running: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800"
};

export function Badge({ className, tone = "pending", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        toneMap[tone] || toneMap.pending,
        className
      )}
      {...props}
    />
  );
}
