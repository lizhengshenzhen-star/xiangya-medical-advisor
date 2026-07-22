/**
 * 疾病场景分类器：症状/主诉 → 医院优势图谱可用的 scenario key
 */

export type DiseaseScenario =
  | "精神心理"
  | "神经外科疑难"
  | "急危重症"
  | "呼吸与胸部"
  | "综合未明";

export interface DiseaseScenarioInput {
  symptoms: string[];
  chiefComplaint?: string;
  age?: number;
  duration?: string;
}

export interface DiseaseScenarioResult {
  scenario: DiseaseScenario;
  confidence: number;
  matchedKeywords: string[];
  /** 多场景同时命中时的次选，供解释 */
  runnersUp?: Array<{ scenario: DiseaseScenario; score: number }>;
}

const RULES: Array<{
  scenario: DiseaseScenario;
  keywords: string[];
  weight: number;
}> = [
  {
    scenario: "急危重症",
    weight: 1.35,
    keywords: [
      "胸痛",
      "突发胸痛",
      "大汗",
      "呼吸困难",
      "喘不过气",
      "意识障碍",
      "昏迷",
      "大出血",
      "吐血",
      "咯血不止",
      "突发偏瘫",
      "突然不会说话",
      "说话含糊",
      "口齿不清",
      "右手没劲",
      "左手没劲",
      "肢体无力",
      "卒中",
      "心梗",
      "急救",
      "急诊",
    ],
  },
  {
    scenario: "精神心理",
    weight: 1.1,
    keywords: [
      "焦虑",
      "抑郁",
      "失眠",
      "惊恐",
      "惊恐发作",
      "强迫",
      "情绪低落",
      "心慌伴焦虑",
      "恐慌",
      "心理咨询",
      "CBT",
      "认知行为",
      "不想吃药",
      "会谈",
      "情绪问题",
      "睡不着",
    ],
  },
  {
    scenario: "神经外科疑难",
    weight: 1.2,
    keywords: [
      "脑肿瘤",
      "脑瘤",
      "动脉瘤",
      "脑动脉瘤",
      "脑出血",
      "颅内出血",
      "视物重影",
      "复杂头痛",
      "神经定位",
      "颅内占位",
      "脑膜瘤",
      "垂体瘤",
      "脑血管畸形",
    ],
  },
  {
    scenario: "呼吸与胸部",
    weight: 1.0,
    keywords: [
      "咳嗽",
      "咳血",
      "肺部结节",
      "肺结节",
      "肺癌",
      "气胸",
      "胸闷伴咳嗽",
      "呼吸科",
      "胸部CT",
      "手术评估",
    ],
  },
];

function normalizeText(input: DiseaseScenarioInput): string {
  const parts = [
    input.chiefComplaint || "",
    ...(input.symptoms || []),
    input.duration || "",
  ];
  return parts.join(" ").toLowerCase();
}

function findMatches(text: string, keywords: string[]): string[] {
  const hit: string[] = [];
  for (const kw of keywords) {
    if (text.includes(kw.toLowerCase())) hit.push(kw);
  }
  return hit;
}

/**
 * 规则分类：急危重症优先；否则按命中关键词加权。
 */
export function classifyDiseaseScenario(
  input: DiseaseScenarioInput
): DiseaseScenarioResult {
  const text = normalizeText(input);
  if (!text.trim()) {
    return {
      scenario: "综合未明",
      confidence: 0.35,
      matchedKeywords: [],
    };
  }

  const scored = RULES.map((rule) => {
    const matched = findMatches(text, rule.keywords);
    const score = matched.length * rule.weight;
    return { scenario: rule.scenario, matched, score };
  }).filter((x) => x.score > 0);

  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      scenario: "综合未明",
      confidence: 0.4,
      matchedKeywords: [],
    };
  }

  const top = scored[0];
  // 急危重症只要命中就抬高置信并优先
  const emergency = scored.find((s) => s.scenario === "急危重症");
  const chosen =
    emergency && emergency.matched.length > 0 ? emergency : top;

  const confidence = Math.min(
    0.98,
    0.55 + chosen.matched.length * 0.12 + (chosen.scenario === "急危重症" ? 0.1 : 0)
  );

  return {
    scenario: chosen.scenario,
    confidence: Number(confidence.toFixed(2)),
    matchedKeywords: chosen.matched,
    runnersUp: scored
      .filter((s) => s.scenario !== chosen.scenario)
      .slice(0, 2)
      .map((s) => ({ scenario: s.scenario, score: Number(s.score.toFixed(2)) })),
  };
}

/** 从自由叙事抽取粗症状词，供编排层调用 */
export function extractSymptomHints(narrative: string): string[] {
  const pool = RULES.flatMap((r) => r.keywords);
  const text = narrative.toLowerCase();
  return [...new Set(pool.filter((kw) => text.includes(kw.toLowerCase())))];
}
