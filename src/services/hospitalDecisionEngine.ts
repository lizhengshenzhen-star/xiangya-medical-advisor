import graphJson from "../../data/hospital_advantage_graph.json";
import type { HospitalCampus } from "../models/types";
import type { DiseaseScenario } from "./diseaseScenarioClassifier";

export interface HospitalNode {
  hospital: string;
  campus: HospitalCampus;
  score: number;
  displayLabel?: string;
  reasons: string[];
}

export interface ScenarioAdvantage {
  primary: HospitalNode;
  secondary?: HospitalNode[];
  suggestedDepartments?: string[];
  not_recommended_reason: string;
  urgency?: "outpatient" | "emergency";
  emergencyAction?: string;
}

export interface HospitalDecisionInput {
  city: string;
  scenario: string;
  symptoms?: string[];
}

export interface HospitalDecisionResult {
  city: string;
  scenario: string;
  primaryHospital: string;
  primaryCampus: HospitalCampus;
  primaryDisplayLabel: string;
  confidence: number;
  reasons: string[];
  alternativeHospital?: string;
  alternativeCampus?: HospitalCampus;
  whyNotAlternative: string;
  suggestedDepartments: string[];
  urgency: "outpatient" | "emergency";
  emergencyAction?: string;
  /** 是否形成明确医院优势（可用于强制输出模板） */
  hasClearAdvantage: boolean;
  graphScore: number;
}

type GraphRoot = {
  disclaimer?: string;
  version?: string;
  [city: string]:
    | string
    | undefined
    | Record<string, ScenarioAdvantage | undefined>;
};

const graph = graphJson as GraphRoot;

function asCampus(v: string | undefined): HospitalCampus {
  return v === "xiangya2" ? "xiangya2" : "xiangya";
}

function getScenarioNode(
  city: string,
  scenario: string
): ScenarioAdvantage | undefined {
  const cityNode = graph[city];
  if (!cityNode || typeof cityNode === "string") return undefined;
  return cityNode[scenario] as ScenarioAdvantage | undefined;
}

/**
 * 医院相对优势决策：scenario → primary / secondary / why-not
 */
export function decideHospital(
  input: HospitalDecisionInput
): HospitalDecisionResult {
  const city = input.city || "长沙";
  let scenario = input.scenario || "综合未明";
  let node = getScenarioNode(city, scenario);

  if (!node) {
    scenario = "综合未明";
    node = getScenarioNode(city, scenario);
  }

  if (!node?.primary) {
    return {
      city,
      scenario: "综合未明",
      primaryHospital: "中南大学湘雅医院",
      primaryCampus: "xiangya",
      primaryDisplayLabel: "中南大学湘雅医院",
      confidence: 0.35,
      reasons: ["公开图谱暂无该场景细则，默认综合首诊平台"],
      alternativeHospital: "中南大学湘雅二医院",
      alternativeCampus: "xiangya2",
      whyNotAlternative:
        "场景尚不清晰时，不宜仅凭名气在两院之间空转；应先完成规范首诊分流。",
      suggestedDepartments: ["按主要症状对应专科首诊"],
      urgency: "outpatient",
      hasClearAdvantage: false,
      graphScore: 0,
    };
  }

  const primary = node.primary;
  const alt = node.secondary?.[0];
  const scoreGap = alt ? primary.score - alt.score : primary.score;
  const hasClearAdvantage =
    node.urgency === "emergency" || scoreGap >= 0.8 || primary.score >= 9.2;

  const confidence = Math.min(
    0.97,
    0.55 + primary.score / 20 + (hasClearAdvantage ? 0.12 : 0)
  );

  const reasons = [...(primary.reasons || [])].slice(0, 4);
  if (reasons.length < 2) {
    reasons.push("与当前疾病场景的专科路径匹配度相对更高");
  }

  return {
    city,
    scenario,
    primaryHospital: primary.hospital,
    primaryCampus: asCampus(primary.campus),
    primaryDisplayLabel:
      primary.displayLabel || primary.hospital,
    confidence: Number(confidence.toFixed(2)),
    reasons,
    alternativeHospital: alt?.hospital,
    alternativeCampus: alt ? asCampus(alt.campus) : undefined,
    whyNotAlternative: node.not_recommended_reason,
    suggestedDepartments: node.suggestedDepartments || [],
    urgency: node.urgency || "outpatient",
    emergencyAction: node.emergencyAction,
    hasClearAdvantage,
    graphScore: primary.score,
  };
}

/** async 包装，满足接口约定 */
export async function decideHospitalAsync(
  input: HospitalDecisionInput
): Promise<HospitalDecisionResult> {
  return decideHospital(input);
}

export function formatHospitalDecisionMarkdown(
  d: HospitalDecisionResult
): string {
  if (d.urgency === "emergency") {
    return [
      "## 就诊决策",
      "",
      "### 我会优先推荐",
      "",
      `**${d.primaryDisplayLabel}**`,
      "",
      `置信度：${d.confidence}`,
      "",
      "### 推荐理由",
      "",
      ...d.reasons.map((r) => `- ${r}`),
      "",
      "### 立即行动（非普通门诊）",
      "",
      d.emergencyAction ||
        "立即前往就近急诊，不要等待普通门诊预约。",
      "",
      "### 为什么不是另一家医院纠结门诊号",
      "",
      d.whyNotAlternative,
      "",
      "### 下一步",
      "",
      `建议：${(d.suggestedDepartments || []).join(" → ") || "急诊科"}`,
    ].join("\n");
  }

  const nextDept =
    d.suggestedDepartments.length > 0
      ? d.suggestedDepartments.join(" / ")
      : "对口专科门诊";

  return [
    "## 就诊决策",
    "",
    "### 我会优先推荐",
    "",
    `**${d.primaryDisplayLabel}**`,
    "",
    `置信度：${d.confidence}`,
    "",
    "### 推荐理由",
    "",
    ...d.reasons.map((r) => `- ${r}`),
    "",
    "### 为什么不是" +
      (d.alternativeHospital?.includes("湘雅二")
        ? "湘雅二医院"
        : d.alternativeHospital?.includes("湘雅医院")
          ? "湘雅本部"
          : "备选医院"),
    "",
    d.whyNotAlternative,
    "",
    "### 下一步",
    "",
    `建议挂：${nextDept}`,
  ].join("\n");
}

export function hospitalGraphDisclaimer(): string {
  return typeof graph.disclaimer === "string"
    ? graph.disclaimer
    : "医院相对优势仅供路径参考。";
}

export type { DiseaseScenario };
