/** AI 医疗决策结果页 — 结构化类型 */

export const TherapyCapabilityTag = {
  CBT: "CBT",
  Depression: "抑郁障碍",
  Anxiety: "焦虑障碍",
  Psychotherapy: "心理治疗",
  LongTermTalk: "长期会谈",
  Sleep: "睡眠障碍",
  Adolescent: "青少年心理",
  MedicationEval: "药物评估",
  FirstVisitFriendly: "首诊友好",
  Trauma: "创伤治疗",
} as const;

export type TherapyCapabilityTag =
  (typeof TherapyCapabilityTag)[keyof typeof TherapyCapabilityTag];

export const THERAPY_TAG_ENUM = Object.values(TherapyCapabilityTag);

export type MatchLevel = "高" | "中" | "低";
export type RiskLevel = "非急诊，可预约" | "建议尽快门诊" | "高危，优先急诊";

export type DoctorRoleSlot = "primary" | "alternative" | "styleAlternative";

export interface PatientProfile {
  /** 疾病方向，如抑郁/焦虑相关 */
  diseaseDirection?: string;
  coreNeed: string;
  treatmentPreference: string;
  visitGoal: string;
  riskLevel: RiskLevel;
  confidencePercent: number;
}

export interface MatchScoreBreakdown {
  therapyOrientation: number;
  diseaseMatch: number;
  talkEvidence: number;
  firstVisitFriendly: number;
  bookingConvenience: number;
}

export const MATCH_WEIGHTS = {
  therapyOrientation: 0.35,
  diseaseMatch: 0.25,
  talkEvidence: 0.2,
  firstVisitFriendly: 0.1,
  bookingConvenience: 0.1,
} as const;

export interface DoctorDecisionCandidate {
  id: string;
  role: DoctorRoleSlot;
  name: string;
  avatarInitials: string;
  hospital: string;
  department: string;
  title: string;
  academicLevel: string;
  matchScore: number;
  matchLevel: MatchLevel;
  scoreBreakdown: MatchScoreBreakdown;
  scoreExplain: string;
  capabilityTags: TherapyCapabilityTag[];
  personalizedReason: string;
  suitableFor: string[];
  notIdealFor: string[];
  bookingType: string;
  onlineSupported: boolean;
  scheduleStatus: string;
  bookingUrl?: string;
}

export interface WhyNotItem {
  label: string;
  betterFor: string;
}

export interface DoctorDecisionResult {
  profile: PatientProfile;
  decisionSummary: [string, string, string];
  candidates: DoctorDecisionCandidate[];
  moreDoctors: Array<{ id: string; name: string; title: string; hospital: string }>;
  whyNot: WhyNotItem[];
  primaryDoctorName: string;
}
