import { cn } from "../lib/utils";

const variants: Record<string, string> = {
  success: "bg-green-900/50 text-green-400 border-green-700",
  failed: "bg-red-900/50 text-red-400 border-red-700",
  online: "bg-green-900/50 text-green-400 border-green-700",
  offline: "bg-slate-700 text-slate-400 border-slate-600",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        variants[status] ?? "bg-slate-700 text-slate-300 border-slate-600"
      )}
    >
      {status}
    </span>
  );
}
