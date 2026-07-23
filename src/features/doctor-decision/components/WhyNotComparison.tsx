import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import type { WhyNotItem } from "../types";

export function WhyNotComparison({ items }: { items: WhyNotItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          为什么不是其他选择
        </p>
        <CardTitle className="text-[15px]">更适合谁（不贬低医生）</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        {items.slice(0, 2).map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <p className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {item.label}
            </p>
            <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
              {item.betterFor}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
