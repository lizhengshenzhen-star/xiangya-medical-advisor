import {
  DECISION_STAGES,
  type DecisionStage,
  type DecisionStageId,
  type StructuredNeeds,
} from "../models/types";

/**
 * 阶段置信度校准：避免仅凭自然语言过度自信
 * - 仅自然语言 ≤ 0.75
 * - 缺既往治疗史 ≤ 0.70
 * - 缺检查结果 ≤ 0.65
 * - 完整病程+治疗史才可 > 0.80
 */
export function calibrateStageConfidence(params: {
  rawConfidence: number;
  narrative: string;
  needs: StructuredNeeds;
}): number {
  const text = params.narrative;
  const hasTreatmentHistory =
    /一直吃药|吃过药|治疗过|看过医生|既往|复诊|服药|心理治疗过|咨询过|住院|出院/.test(
      text
    ) || params.needs.emotionalCues.some((c) => c.includes("失望"));
  const hasExamOrFullCourse =
    /报告|检查单|CT|MRI|化验|诊断证明|病程|发病以来|几个月|几年/.test(text);

  let cap = 0.75; // 仅自然语言默认上限
  if (!hasTreatmentHistory) cap = Math.min(cap, 0.7);
  if (!hasExamOrFullCourse) cap = Math.min(cap, 0.65);
  if (hasTreatmentHistory && hasExamOrFullCourse) cap = 0.88;

  // 意图很清晰时可略抬，但仍受 cap 约束
  const intentBoost =
    params.needs.trueIntent && params.needs.trueIntent.confidence >= 0.8
      ? 0.05
      : 0;

  const calibrated = Math.min(cap, params.rawConfidence + intentBoost);
  // 咨询路径选择案例：落在 0.65–0.75 更诚实
  if (
    params.needs.trueIntent?.modality === "psychotherapy_cbt" ||
    params.needs.trueIntent?.modality === "psychological_counseling"
  ) {
    return Number(Math.min(calibrated, 0.72).toFixed(2));
  }
  return Number(calibrated.toFixed(2));
}

export function resolveStage(
  needs: StructuredNeeds,
  narrative = ""
): {
  stage: DecisionStage;
  confidence: number;
  scores: Record<string, number>;
  displayLabel: string;
} {
  const scores: Record<string, number> = {
    risk_confirmation: 0,
    initial_diagnosis: 0,
    treatment_choice: 0,
    surgery_decision: 0,
    long_term_management: 0,
  };

  needs.stageCandidates.forEach((id, idx) => {
    scores[id] = (scores[id] || 0) + (5 - idx);
  });

  if (needs.constraints.firstVisit) scores.initial_diagnosis += 1;
  if (needs.emotionalCues.some((c) => c.includes("失望"))) {
    scores.treatment_choice += 1;
    scores.long_term_management += 1;
  }
  if (
    needs.capabilityNeeds.some((t) => t.includes("surgery") || t.includes("minimally"))
  ) {
    scores.surgery_decision += 2;
  }
  if (
    needs.capabilityNeeds.some((t) => t === "CBT" || t === "depression_management")
  ) {
    scores.long_term_management += 2;
    scores.treatment_choice += 1;
  }
  if (
    needs.trueIntent?.modality === "psychotherapy_cbt" ||
    needs.trueIntent?.modality === "psychological_counseling"
  ) {
    scores.treatment_choice += 3;
    scores.long_term_management += 2;
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topId = (ranked[0]?.[0] || "initial_diagnosis") as DecisionStageId;
  const top = ranked[0]?.[1] || 0;
  const second = ranked[1]?.[1] || 0;
  const rawConfidence = Math.min(0.95, 0.45 + (top - second) * 0.1 + top * 0.04);
  const confidence = calibrateStageConfidence({
    rawConfidence,
    narrative,
    needs,
  });

  const stage = DECISION_STAGES[topId];
  // 路径选择场景用更贴切的展示名（不改内部五阶段框架）
  const displayLabel =
    needs.trueIntent?.modality === "psychotherapy_cbt" ||
    needs.trueIntent?.modality === "psychological_counseling" ||
    needs.trueIntent?.modality === "combined"
      ? "初步治疗路径选择阶段"
      : stage.label;

  return {
    stage,
    confidence,
    scores,
    displayLabel,
  };
}
