import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import type { DoctorDecisionResult } from "../types";

export function AIDecisionSummary({
  lines,
}: {
  lines: DoctorDecisionResult["decisionSummary"];
}) {
  return (
    <Card className="border-slate-200/90 dark:border-slate-700">
      <CardHeader className="pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          AI 决策摘要
        </p>
        <CardTitle className="text-[15px]">3 条行动结论</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-1">
        {lines.map((line) => (
          <div key={line} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <p className="text-[14px] leading-snug text-slate-800 dark:text-slate-100">{line}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
