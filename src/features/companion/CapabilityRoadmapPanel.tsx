import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { CAPABILITY_ROADMAP } from "../../models/companion";

export function CapabilityRoadmapPanel({
  onInterest,
}: {
  onInterest?: (featureKey: string) => void;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          能力规划
        </p>
        <CardTitle className="text-[15px]">后续能力（仅展示，收集需求）</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {CAPABILITY_ROADMAP.map((item) => (
          <button
            key={item.key}
            type="button"
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-left dark:border-slate-700 dark:bg-slate-800/40"
            onClick={() => onInterest?.(item.key)}
          >
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {item.title}
            </span>
            <Badge variant="warn">{item.status}</Badge>
          </button>
        ))}
        <p className="text-[11px] text-slate-400">点击条目可标记「我感兴趣」，帮助排期。</p>
      </CardContent>
    </Card>
  );
}
