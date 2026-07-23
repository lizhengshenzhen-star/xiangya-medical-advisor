import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { MEDICAL_DISCLAIMER } from "../../../safety/medicalBoundary";
import type { DoctorDecisionResult } from "../types";
import { AIDecisionSummary } from "./AIDecisionSummary";
import { DoctorCandidateList } from "./DoctorCandidateList";
import { NextActionPanel } from "./NextActionPanel";
import { PatientProfileCard } from "./PatientProfileCard";
import { WhyNotComparison } from "./WhyNotComparison";

export function DoctorDecisionResultPage({
  result,
  onRefine,
  feedbackSlot,
  roadmapSlot,
  title = "AI 医生匹配结果",
}: {
  result: DoctorDecisionResult;
  onRefine?: () => void;
  feedbackSlot?: ReactNode;
  roadmapSlot?: ReactNode;
  title?: string;
}) {
  const nav = useNavigate();
  const [dark, setDark] = useState(false);
  const primary = result.candidates.find((c) => c.role === "primary") || result.candidates[0];

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    return () => root.classList.remove("dark");
  }, [dark]);

  const bookPrimary = () => {
    if (primary?.bookingUrl) {
      window.open(primary.bookingUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="decision-root mx-auto min-h-[100dvh] w-full max-w-[430px] bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-medical-600 dark:text-medical-300">
            陪诊师决策助手
          </p>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="切换深色模式"
          onClick={() => setDark((v) => !v)}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="space-y-4 px-4 pb-44">
        <PatientProfileCard profile={result.profile} />
        <AIDecisionSummary lines={result.decisionSummary} />
        <DoctorCandidateList candidates={result.candidates} moreDoctors={result.moreDoctors} />
        <WhyNotComparison items={result.whyNot} />
        {feedbackSlot}
        {roadmapSlot}
        <p className="px-1 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          {MEDICAL_DISCLAIMER}
        </p>
        <Button variant="ghost" className="w-full text-xs" onClick={() => nav("/app/match")}>
          返回重新匹配
        </Button>
      </div>

      <NextActionPanel
        primaryName={result.primaryDoctorName}
        onBookPrimary={bookPrimary}
        onRefine={onRefine ?? (() => nav("/app/match"))}
        onCarePlan={() => nav("/app")}
      />
    </div>
  );
}
