import { CalendarClock, ExternalLink, Wifi, WifiOff } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { cn } from "../../../lib/utils";
import type { DoctorDecisionCandidate, DoctorRoleSlot } from "../types";
import { MatchScorePopover } from "./MatchScorePopover";

const ROLE_META: Record<
  DoctorRoleSlot,
  { label: string; hint: string; ring: string }
> = {
  primary: {
    label: "主推荐",
    hint: "AI 主推 · 优先沟通挂号",
    ring: "ring-2 ring-medical-500/40",
  },
  alternative: {
    label: "备选",
    hint: "主推荐约不到号时的替代",
    ring: "ring-1 ring-slate-200 dark:ring-slate-600",
  },
  styleAlternative: {
    label: "备选",
    hint: "第二备选 · 沟通风格可能不同",
    ring: "ring-1 ring-slate-200 dark:ring-slate-600",
  },
};

export function DoctorDecisionCard({ doctor }: { doctor: DoctorDecisionCandidate }) {
  const role = ROLE_META[doctor.role];

  return (
    <Card className={cn("overflow-hidden", role.ring)}>
      <CardHeader className="gap-3 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-medical-600 text-lg font-bold text-white dark:bg-medical-500">
              {doctor.avatarInitials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{doctor.name}</h3>
                <Badge variant={doctor.role === "primary" ? "default" : "secondary"}>
                  {role.label}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{role.hint}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            {doctor.hospital} · {doctor.department}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {doctor.title} / {doctor.academicLevel}
          </p>
        </div>

        <MatchScorePopover doctor={doctor} />
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {doctor.capabilityTags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        <section>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-medical-700 dark:text-medical-300">
            为什么推荐给你
          </h4>
          <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
            {doctor.personalizedReason}
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-emerald-50/80 p-3 dark:bg-emerald-950/30">
            <p className="mb-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              适合
            </p>
            <ul className="space-y-1">
              {doctor.suitableFor.map((item) => (
                <li key={item} className="text-[12px] leading-snug text-emerald-900/90 dark:text-emerald-100/90">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="mb-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              不适合
            </p>
            <ul className="space-y-1">
              {doctor.notIdealFor.map((item) => (
                <li key={item} className="text-[12px] leading-snug text-slate-600 dark:text-slate-300">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            建议挂号：{doctor.bookingType}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              {doctor.onlineSupported ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              {doctor.onlineSupported ? "支持线上" : "暂不主推线上"}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              {doctor.scheduleStatus}
            </span>
          </div>
          <Button
            className="w-full"
            variant={doctor.role === "primary" ? "default" : "outline"}
            onClick={() => {
              if (doctor.bookingUrl) window.open(doctor.bookingUrl, "_blank", "noopener,noreferrer");
            }}
          >
            查看排班并挂号
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
