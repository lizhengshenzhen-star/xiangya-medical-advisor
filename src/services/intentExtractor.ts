import {
  classifyDiseaseScenario,
  type DiseaseScenario,
} from "./diseaseScenarioClassifier";
import {
  detectPreferredGender,
  type PreferredGender,
} from "./doctorGender";

export type VisitGoal = "first_visit" | "diagnosis" | "surgery" | "follow_up";
export type UrgencyLevel = "low" | "medium" | "high";

export interface IntentExtractResult {
  chiefComplaint: string;
  diseaseScenario: DiseaseScenario;
  city?: string;
  visitGoal: VisitGoal;
  urgency: UrgencyLevel;
  matchedKeywords: string[];
  scenarioConfidence: number;
  /** 双路径提示，如精神心理 + 心慌排查 */
  dualPaths?: string[];
  /** 用户明确提出的医生性别偏好 */
  preferredGender?: PreferredGender;
  raw: string;
}

const CITY_PATTERNS: Array<{ re: RegExp; city: string }> = [
  { re: /长沙|湘雅|附二|湖南/, city: "长沙" },
];

function detectCity(text: string): string | undefined {
  for (const p of CITY_PATTERNS) {
    if (p.re.test(text)) return p.city;
  }
  return "长沙"; // 产品默认服务长沙两院
}

function detectVisitGoal(text: string): VisitGoal {
  if (/手术|开刀|微创|手术评估|要不要手术|胸外/.test(text)) return "surgery";
  if (/复诊|随访|调药|复查|长期/.test(text)) return "follow_up";
  if (/确诊|诊断|报告|结节|查出来|体检发现/.test(text)) return "diagnosis";
  return "first_visit";
}

function detectUrgency(text: string, scenario: DiseaseScenario): UrgencyLevel {
  if (
    scenario === "急危重症" ||
    /突然|突发|急救|急诊|含糊|偏瘫|大汗|晕倒|意识/.test(text)
  ) {
    return "high";
  }
  if (/一个月|几周|加重|难受|睡不着|心慌/.test(text)) return "medium";
  return "low";
}

function extractChiefComplaint(text: string): string {
  const cleaned = text
    .replace(/[，。！？、\s]+/g, " ")
    .replace(/长沙|挂哪个|哪个医生|湘雅|附二|医院|科室|怎么办|想知道/g, "")
    .trim();
  if (cleaned.length <= 24) return cleaned || text.slice(0, 24);
  // 取前若干症状词
  const keys = [
    "失眠",
    "焦虑",
    "抑郁",
    "心慌",
    "惊恐",
    "肺结节",
    "结节",
    "头晕",
    "手麻",
    "说话含糊",
    "胸痛",
    "咳嗽",
  ];
  const hit = keys.filter((k) => text.includes(k));
  if (hit.length) return hit.slice(0, 4).join("、");
  return cleaned.slice(0, 28);
}

function detectDualPaths(text: string, scenario: DiseaseScenario): string[] | undefined {
  if (scenario === "精神心理" && /心慌|心跳|胸闷/.test(text)) {
    return ["精神心理", "心律失常排查"];
  }
  if (/肺结节|结节/.test(text) && /手术/.test(text)) {
    return ["呼吸评估", "胸外科手术评估"];
  }
  return undefined;
}

/**
 * 一句话意图抽取：尽量不追问，先出可执行方向。
 */
export function extractIntent(input: string): IntentExtractResult {
  const raw = input.trim();
  const scenarioResult = classifyDiseaseScenario({
    symptoms: [raw],
    chiefComplaint: raw,
  });

  // 卒中口语补充：说话含糊 / 手麻没劲
  let scenario = scenarioResult.scenario;
  let matched = [...scenarioResult.matchedKeywords];
  let confidence = scenarioResult.confidence;

  if (
    /说话含糊|口齿不清|右手没劲|左手没劲|肢体无力|一侧没劲|突发.*手麻|突然.*头晕.*手麻/.test(
      raw
    )
  ) {
    scenario = "急危重症";
    matched = [...new Set([...matched, "突发神经症状"])];
    confidence = Math.max(confidence, 0.92);
  }

  if (/肺结节|肺部结节/.test(raw) && scenario === "综合未明") {
    scenario = "呼吸与胸部";
    matched = [...new Set([...matched, "肺结节"])];
    confidence = Math.max(confidence, 0.85);
  }

  const preferredGender = detectPreferredGender(raw);
  if (preferredGender) {
    matched = [...new Set([...matched, preferredGender === "female" ? "女医生" : "男医生"])];
    confidence = Math.max(confidence, 0.9);
  }

  return {
    chiefComplaint: extractChiefComplaint(raw),
    diseaseScenario: scenario,
    city: detectCity(raw),
    visitGoal: detectVisitGoal(raw),
    urgency: detectUrgency(raw, scenario),
    matchedKeywords: matched,
    scenarioConfidence: confidence,
    dualPaths: detectDualPaths(raw, scenario),
    preferredGender,
    raw,
  };
}
