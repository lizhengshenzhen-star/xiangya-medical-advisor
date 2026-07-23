import type { MatchLevel, MatchScoreBreakdown } from "./types";
import { MATCH_WEIGHTS } from "./types";

export function computeMatchScore(breakdown: MatchScoreBreakdown): number {
  const raw =
    breakdown.therapyOrientation * MATCH_WEIGHTS.therapyOrientation +
    breakdown.diseaseMatch * MATCH_WEIGHTS.diseaseMatch +
    breakdown.talkEvidence * MATCH_WEIGHTS.talkEvidence +
    breakdown.firstVisitFriendly * MATCH_WEIGHTS.firstVisitFriendly +
    breakdown.bookingConvenience * MATCH_WEIGHTS.bookingConvenience;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

export function matchLevelFromScore(score: number): MatchLevel {
  if (score >= 75) return "高";
  if (score >= 60) return "中";
  return "低";
}

export function matchScoreTone(score: number): "high" | "mid" | "warn" | "low" {
  if (score >= 90) return "high";
  if (score >= 75) return "mid";
  if (score >= 60) return "warn";
  return "low";
}

export const MATCH_DIMENSION_LABELS: Record<keyof MatchScoreBreakdown, string> = {
  therapyOrientation: "治疗取向匹配（CBT）",
  diseaseMatch: "疾病匹配（抑郁）",
  talkEvidence: "会谈能力证据",
  firstVisitFriendly: "首诊友好度",
  bookingConvenience: "预约便利性",
};

export const MATCH_DIMENSION_WEIGHT_PCT: Record<keyof MatchScoreBreakdown, number> = {
  therapyOrientation: 35,
  diseaseMatch: 25,
  talkEvidence: 20,
  firstVisitFriendly: 10,
  bookingConvenience: 10,
};
