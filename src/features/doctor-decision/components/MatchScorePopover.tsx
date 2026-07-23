import { Info } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { cn } from "../../../lib/utils";
import {
  MATCH_DIMENSION_LABELS,
  MATCH_DIMENSION_WEIGHT_PCT,
  matchScoreTone,
} from "../matchScore";
import type { DoctorDecisionCandidate } from "../types";
import { MATCH_WEIGHTS } from "../types";

const toneClass = {
  high: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800",
  mid: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800",
  warn: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-800",
  low: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600",
} as const;

export function MatchScorePopover({ doctor }: { doctor: DoctorDecisionCandidate }) {
  const tone = matchScoreTone(doctor.matchScore);
  const dims = Object.keys(MATCH_WEIGHTS) as Array<keyof typeof MATCH_WEIGHTS>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1",
            toneClass[tone],
          )}
        >
          {doctor.matchScore}分 · {doctor.matchLevel}匹配
          <Info className="h-3.5 w-3.5 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))]">
        <p className="mb-2 font-semibold text-slate-900 dark:text-slate-50">匹配分拆解</p>
        <p className="mb-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          为什么是 {doctor.matchScore} 分，而不是 85 分：{doctor.scoreExplain}
        </p>
        <ul className="space-y-2">
          {dims.map((key) => (
            <li key={key} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-600 dark:text-slate-300">
                {MATCH_DIMENSION_LABELS[key]}
                <span className="ml-1 text-slate-400">({MATCH_DIMENSION_WEIGHT_PCT[key]}%)</span>
              </span>
              <Badge variant="outline">{doctor.scoreBreakdown[key]}</Badge>
            </li>
          ))}
        </ul>
        <Button variant="ghost" size="sm" className="mt-3 w-full text-xs" tabIndex={-1}>
          权重固定 · 可解释推荐
        </Button>
      </PopoverContent>
    </Popover>
  );
}
