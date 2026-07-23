export type {
  DoctorDecisionResult,
  DoctorDecisionCandidate,
  PatientProfile,
  WhyNotItem,
  MatchScoreBreakdown,
  MatchLevel,
  RiskLevel,
  DoctorRoleSlot,
} from "./types";
export type { TherapyCapabilityTag as TherapyCapabilityTagName } from "./types";
export { TherapyCapabilityTag, THERAPY_TAG_ENUM, MATCH_WEIGHTS } from "./types";
export {
  computeMatchScore,
  matchLevelFromScore,
  matchScoreTone,
  MATCH_DIMENSION_LABELS,
  MATCH_DIMENSION_WEIGHT_PCT,
} from "./matchScore";
export { mockDoctorDecisionResult } from "./mockDecisionResult";
export { mapFastResultToDecision } from "./mapFastResultToDecision";
export { DoctorDecisionResultPage } from "./components/DoctorDecisionResultPage";
export { PatientProfileCard } from "./components/PatientProfileCard";
export { AIDecisionSummary } from "./components/AIDecisionSummary";
export { DoctorCandidateList } from "./components/DoctorCandidateList";
export { DoctorDecisionCard } from "./components/DoctorDecisionCard";
export { MatchScorePopover } from "./components/MatchScorePopover";
export { WhyNotComparison } from "./components/WhyNotComparison";
export { NextActionPanel } from "./components/NextActionPanel";
