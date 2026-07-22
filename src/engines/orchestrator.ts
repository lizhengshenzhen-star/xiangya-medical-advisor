import { parseNarrative } from "../listening/narrativeParser";
import { buildEmotionalSummary } from "../listening/emotionalSummary";
import { needsFromParse } from "../listening/dynamicQuestionGenerator";
import { modalityLabel, type CareModality } from "../listening/trueIntentEngine";
import { resolveRealProblem } from "./problemEngine";
import { resolveStage } from "./stageEngine";
import { analyzeConstraints } from "./constraintEngine";
import { resolveCapabilityNeeds } from "./capabilityEngine";
import { matchDoctors } from "./matchingEngine";
import { explainDecision } from "./explanationEngine";
import {
  CapabilityTag,
  type AiDecision,
  type HospitalVisitDecision,
  type StructuredNeeds,
} from "../models/types";
import type { DoctorRepository } from "../repositories/doctorRepository";
import { departmentsForModality } from "../data/hospitalDepartments";
import { HospitalCampus } from "../models/types";
import {
  classifyDiseaseScenario,
  extractSymptomHints,
} from "../services/diseaseScenarioClassifier";
import {
  decideHospital,
  formatHospitalDecisionMarkdown,
} from "../services/hospitalDecisionEngine";

/**
 * 编排顺序（不可颠倒）：
 * 1) 真实意图
 * 2) 疾病场景 → 医院相对优势
 * 3) 问题/阶段/约束 → 能力需求
 * 4) 科室/医生匹配（优先院区加权）
 * 5) 表达
 */
export async function runDecisionPipeline(params: {
  narrative: string;
  structuredNeeds?: StructuredNeeds;
  doctorRepo: DoctorRepository;
  city?: string;
}): Promise<{ decision: AiDecision; structuredNeeds: StructuredNeeds }> {
  const parse = parseNarrative(params.narrative);
  let needs = params.structuredNeeds ?? needsFromParse(parse);

  if (!needs.trueIntent) needs = { ...needs, trueIntent: parse.trueIntent };
  if (
    needs.trueIntent &&
    (needs.trueIntent.modality === "psychological_counseling" ||
      needs.trueIntent.modality === "psychotherapy_cbt")
  ) {
    needs = {
      ...needs,
      capabilityNeeds: [
        ...new Set([
          ...needs.capabilityNeeds.filter(
            (t) =>
              t !== CapabilityTag.MentalHealth &&
              t !== CapabilityTag.PsychiatryMedication
          ),
          CapabilityTag.PsychologicalCounseling,
          CapabilityTag.Psychotherapy,
          CapabilityTag.DepressionManagement,
          ...(needs.trueIntent.modality === "psychotherapy_cbt" ||
          needs.capabilityNeeds.includes(CapabilityTag.CBT)
            ? [CapabilityTag.CBT]
            : []),
        ]),
      ],
    };
  }

  const emotionalSummary = buildEmotionalSummary(params.narrative, parse);

  // —— 医院相对优势层 ——
  const symptomHints = [
    ...extractSymptomHints(params.narrative),
    ...needs.emotionalCues,
    needs.diseaseArea === "mental" ? "情绪问题" : "",
    needs.trueIntent?.modality === "psychotherapy_cbt" ? "CBT" : "",
    needs.trueIntent?.modality === "psychological_counseling"
      ? "心理咨询"
      : "",
  ].filter(Boolean);

  const scenarioResult = classifyDiseaseScenario({
    symptoms: symptomHints,
    chiefComplaint: params.narrative,
  });
  const hospitalRaw = decideHospital({
    city: params.city || "长沙",
    scenario: scenarioResult.scenario,
    symptoms: symptomHints,
  });
  const hospitalDecision: HospitalVisitDecision = {
    scenario: scenarioResult.scenario,
    scenarioConfidence: scenarioResult.confidence,
    matchedKeywords: scenarioResult.matchedKeywords,
    primaryHospital: hospitalRaw.primaryHospital,
    primaryCampus: hospitalRaw.primaryCampus,
    primaryDisplayLabel: hospitalRaw.primaryDisplayLabel,
    confidence: hospitalRaw.confidence,
    reasons: hospitalRaw.reasons,
    alternativeHospital: hospitalRaw.alternativeHospital,
    whyNotAlternative: hospitalRaw.whyNotAlternative,
    suggestedDepartments: hospitalRaw.suggestedDepartments,
    urgency: hospitalRaw.urgency,
    emergencyAction: hospitalRaw.emergencyAction,
    hasClearAdvantage: hospitalRaw.hasClearAdvantage,
    markdown: formatHospitalDecisionMarkdown(hospitalRaw),
  };

  const problem = resolveRealProblem(needs);
  const stageResult = resolveStage(needs, params.narrative);
  const constraints = analyzeConstraints(needs);
  const caps = resolveCapabilityNeeds(needs, stageResult.stage.id);

  const campusDeptHints = [
    HospitalCampus.Xiangya,
    HospitalCampus.Xiangya2,
  ].map((campus) => {
    const depts = departmentsForModality(
      campus,
      needs.trueIntent?.modality || "unclear"
    );
    return `${campus}: ${depts.map((d) => d.displayName).join(" / ") || "无对口科室配置"}`;
  });

  const doctors = await params.doctorRepo.listAll();
  const emergencyMode = hospitalDecision.urgency === "emergency";
  const matching = matchDoctors({
    doctors: emergencyMode ? [] : doctors,
    needs,
    stageId: stageResult.stage.id,
    capabilityNeeds: caps.tags,
    processBoost: constraints.processWeightBoost,
    preferredCampus: hospitalDecision.primaryCampus,
    emergencyMode,
  });

  const rankingHints: string[] = [];
  rankingHints.push(
    `疾病场景：${hospitalDecision.scenario}（场景置信 ${hospitalDecision.scenarioConfidence}；关键词：${hospitalDecision.matchedKeywords.join("、") || "无"}）`
  );
  rankingHints.push(
    `医院相对优势优先：${hospitalDecision.primaryHospital}（决策置信 ${hospitalDecision.confidence}）`
  );
  if (hospitalDecision.alternativeHospital) {
    rankingHints.push(
      `为什么不是 ${hospitalDecision.alternativeHospital}：${hospitalDecision.whyNotAlternative}`
    );
  }
  if (needs.trueIntent) {
    rankingHints.push(
      `工作流真实意图：${modalityLabel(needs.trueIntent.modality as CareModality)}（置信 ${needs.trueIntent.confidence}）`
    );
    if (needs.trueIntent.evidenceSpans.length) {
      rankingHints.push(
        `意图证据来自原话：${needs.trueIntent.evidenceSpans.join("；")}`
      );
    }
    if (needs.trueIntent.rejectSummary.length) {
      rankingHints.push(needs.trueIntent.rejectSummary.join("；"));
    }
  }
  rankingHints.push(
    `两院科室结构不同，按院区对口科室匹配（仅湘雅/附二）：${campusDeptHints.join(" ｜ ")}`
  );
  if (stageResult.stage.id === "surgery_decision") {
    rankingHints.push("手术决策阶段：适应证与术式相关能力权重大于网络热度。");
  }

  const decision = explainDecision({
    realProblem: problem.realProblem,
    emotionalSummary,
    whyWasteTrip: problem.whyWasteTrip,
    commonPitfall: problem.commonPitfall,
    stage: stageResult.stage,
    stageDisplayLabel: stageResult.displayLabel,
    stageConfidence: stageResult.confidence,
    needs,
    capabilityNeeds: caps.tags,
    matched: matching.matched,
    rankingHints,
    constraintFlags: constraints.flags,
    hospitalDecision,
    engineTrace: {
      problemSignals: [
        ...problem.signals,
        `trueIntent:${needs.trueIntent?.modality}`,
        `scenario:${hospitalDecision.scenario}`,
      ],
      stageScores: stageResult.scores,
      constraintFlags: constraints.flags,
      capabilityNeeds: caps.tags,
      matchingScores: matching.trace,
      diseaseScenario: hospitalDecision.scenario,
      hospitalPrimary: hospitalDecision.primaryHospital,
    },
  });

  return { decision, structuredNeeds: needs };
}
