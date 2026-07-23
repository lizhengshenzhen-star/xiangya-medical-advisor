import type { DoctorProfile } from "../models/types";
import { extractIntent, type IntentExtractResult } from "./intentExtractor";
import {
  generateCandidates,
  formatRecommendationCard,
  type DoctorDirectionCandidate,
} from "./doctorCandidateEngine";
import {
  buildMinimalFollowUps,
  type MinimalFollowUpQuestion,
} from "./minimalFollowUp";
import { formatHospitalDecisionMarkdown, decideHospital } from "./hospitalDecisionEngine";

export interface FastRecommendResult {
  intent: IntentExtractResult;
  candidates: DoctorDirectionCandidate[];
  followUps: MinimalFollowUpQuestion[];
  primaryCardMarkdown: string;
  preliminaryMarkdown: string;
  hospitalMarkdown: string;
  isEmergency: boolean;
}

export function runFastRecommend(params: {
  text: string;
  doctors?: DoctorProfile[];
  rankingBias?: {
    preferSurgery?: boolean;
    preferCounseling?: boolean;
    preferCardiologyCheck?: boolean;
    confirmedFirstVisit?: boolean;
    escalateEmergency?: boolean;
  };
}): FastRecommendResult {
  let intent = extractIntent(params.text);

  if (params.rankingBias?.escalateEmergency) {
    intent = {
      ...intent,
      diseaseScenario: "急危重症",
      urgency: "high",
    };
  }

  const hospital = decideHospital({
    city: intent.city || "长沙",
    scenario: intent.diseaseScenario,
    symptoms: [intent.chiefComplaint, intent.raw],
  });

  const candidates = generateCandidates({
    city: intent.city || "长沙",
    scenario: intent.diseaseScenario,
    goal: intent.visitGoal,
    urgency: intent.urgency,
    chiefComplaint: intent.chiefComplaint,
    dualPaths: intent.dualPaths,
    preferredGender: intent.preferredGender,
    rankingBias: params.rankingBias,
    doctors: params.doctors,
  });

  const isEmergency = Boolean(
    candidates[0]?.isEmergency || intent.urgency === "high"
  );
  const followUps = isEmergency ? [] : buildMinimalFollowUps(intent);

  const primary = candidates[0];
  const alt = candidates[1];
  const primaryCardMarkdown = primary
    ? formatRecommendationCard(primary, alt)
    : "";

  const dualLine = intent.dualPaths?.length
    ? `基于你目前描述，我会先把你放入【${intent.dualPaths.join(" + ")}】路径。`
    : `基于你目前描述，场景判定为【${intent.diseaseScenario}】。`;

  const preliminaryMarkdown = [
    dualLine,
    "",
    "### 优先推荐",
    "",
    `**${primary?.hospital} · ${primary?.department}**`,
    "",
    `适合：${primary?.suitedFor || ""}`,
    primary?.namedDoctors?.length
      ? `\n可参考：${primary.namedDoctors.map((d) => d.name).join("、")}`
      : "",
    "",
    alt
      ? [
          "### 备选推荐",
          "",
          `**${alt.hospital} · ${alt.department}**`,
          "",
          `适合：${alt.suitedFor}`,
        ].join("\n")
      : "",
    followUps[0]
      ? `\n我只再确认一个问题：${followUps[0].prompt}`
      : "\n信息已够先行动；号源以医院官方为准。",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    intent,
    candidates,
    followUps,
    primaryCardMarkdown,
    preliminaryMarkdown,
    hospitalMarkdown: formatHospitalDecisionMarkdown(hospital),
    isEmergency,
  };
}
