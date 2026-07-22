import {
  CapabilityTag,
  ServiceRole,
  type CapabilityTag as CapabilityTagType,
  type ServiceRole as ServiceRoleType,
} from "../models/types";

/**
 * 真实意图（工作流第一层，先于科室/医生匹配）
 * 解决：「心理咨询」被错当成「精神科」这类高频错配。
 */
export const CareModality = {
  PsychologicalCounseling: "psychological_counseling",
  PsychotherapyCbt: "psychotherapy_cbt",
  PsychiatryMedication: "psychiatry_medication",
  Combined: "combined",
  Unclear: "unclear",
} as const;

export type CareModality = (typeof CareModality)[keyof typeof CareModality];

export interface TrueIntent {
  modality: CareModality;
  confidence: number;
  /** 从用户原话抽出的证据片段 */
  evidenceSpans: string[];
  summary: string;
  /** 明确不要什么 */
  rejectSummary: string[];
  preferRoles: ServiceRoleType[];
  excludeRoles: ServiceRoleType[];
  capabilityNeeds: CapabilityTagType[];
  /** 是否已足够明确，可跳过「治疗方式」追问 */
  skipModalityQuestion: boolean;
}

const MODALITY_LABEL: Record<CareModality, string> = {
  [CareModality.PsychologicalCounseling]: "心理咨询（会谈为主，非精神科开药）",
  [CareModality.PsychotherapyCbt]: "心理治疗 / CBT（认知行为取向）",
  [CareModality.PsychiatryMedication]: "精神科药物评估/管理",
  [CareModality.Combined]: "精神科评估 + 心理干预结合",
  [CareModality.Unclear]: "治疗方式尚未明确",
};

export function modalityLabel(m: CareModality): string {
  return MODALITY_LABEL[m];
}

function pickSpans(text: string, patterns: RegExp[]): string[] {
  const spans: string[] = [];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[0]) spans.push(m[0].slice(0, 24));
  }
  return [...new Set(spans)].slice(0, 5);
}

/**
 * 必须在科室匹配之前调用。
 * 规则优先抓「要什么 / 不要什么」对立信号。
 */
export function recognizeTrueIntent(narrative: string): TrueIntent {
  const text = narrative.trim();
  const evidenceSpans: string[] = [];
  let counselingScore = 0;
  let cbtScore = 0;
  let psychiatryScore = 0;
  let rejectPsychiatryScore = 0;

  // —— 要：心理咨询 ——
  if (/心理咨询/.test(text)) {
    counselingScore += 6;
    evidenceSpans.push(...pickSpans(text, [/心理咨询[^，。；]{0,12}/]));
  }
  if (/咨询师|会谈|谈话治疗|倾诉|不想开药|不要开药/.test(text)) {
    counselingScore += 3;
  }
  if (/心理治疗/.test(text)) {
    counselingScore += 4;
    evidenceSpans.push(...pickSpans(text, [/心理治疗[^，。；]{0,12}/]));
  }

  // —— 要：CBT / 认知行为 ——
  if (/认知行为|CBT|cbt/.test(text)) {
    cbtScore += 6;
    counselingScore += 2;
    evidenceSpans.push(...pickSpans(text, [/认知行为[^，。；]{0,10}|CBT|cbt/]));
  }
  if (/擅长抑郁|抑郁症|抑郁情绪|抑郁/.test(text)) {
    counselingScore += 1;
    evidenceSpans.push(...pickSpans(text, [/抑郁[^，。；]{0,8}/]));
  }

  // —— 明确拒绝精神科 / 只要咨询 ——
  if (/不是精神科|不要精神科|别给我挂精神科|不是看精神科|不需要精神科/.test(text)) {
    rejectPsychiatryScore += 8;
    evidenceSpans.push(
      ...pickSpans(text, [/不是精神科|不要精神科|别给我挂精神科|不需要精神科/])
    );
  }
  if (/只要咨询|只要心理|只要会谈|只要CBT|只要认知/.test(text)) {
    counselingScore += 4;
    rejectPsychiatryScore += 3;
  }
  if (/不想只吃药|不要只吃药|不想吃药|排斥吃药|拒绝药物/.test(text)) {
    counselingScore += 3;
    rejectPsychiatryScore += 2;
    evidenceSpans.push(
      ...pickSpans(text, [/不想只吃药|不要只吃药|不想吃药|排斥吃药/])
    );
  }

  // —— 要：精神科药物 ——
  if (/精神科|精神卫生科/.test(text) && !/不是精神科|不要精神科|别.*精神科/.test(text)) {
    psychiatryScore += 4;
  }
  if (/调药|换药|药物评估|开药|吃药调整|药物管理/.test(text)) {
    psychiatryScore += 5;
    evidenceSpans.push(...pickSpans(text, [/调药|换药|药物评估|吃药调整/]));
  }
  if (/精神病|双相|精神分裂/.test(text)) {
    psychiatryScore += 3;
  }

  // —— 联合 ——
  const combineHint =
    /结合|联合|又要咨询又要|药物和心理|心理和药物/.test(text) ||
    (counselingScore >= 3 && psychiatryScore >= 3);

  let modality: CareModality = CareModality.Unclear;
  let confidence = 0.4;
  const rejectSummary: string[] = [];
  let preferRoles: ServiceRoleType[] = [];
  let excludeRoles: ServiceRoleType[] = [];
  let capabilityNeeds: CapabilityTagType[] = [];

  if (rejectPsychiatryScore >= 5 || (counselingScore + cbtScore >= 5 && psychiatryScore < 3)) {
    modality =
      cbtScore >= 4 ? CareModality.PsychotherapyCbt : CareModality.PsychologicalCounseling;
    confidence = Math.min(0.95, 0.55 + (counselingScore + cbtScore + rejectPsychiatryScore) * 0.04);
    preferRoles = [ServiceRole.ClinicalPsychologist, ServiceRole.Counselor];
    excludeRoles = [ServiceRole.Psychiatrist];
    rejectSummary.push("不匹配纯精神科开药路径");
    capabilityNeeds = [
      CapabilityTag.PsychologicalCounseling,
      CapabilityTag.Psychotherapy,
      CapabilityTag.DepressionManagement,
    ];
    if (cbtScore >= 3) capabilityNeeds.push(CapabilityTag.CBT);
  } else if (combineHint && counselingScore >= 2 && psychiatryScore >= 2) {
    modality = CareModality.Combined;
    confidence = 0.7;
    preferRoles = [
      ServiceRole.ClinicalPsychologist,
      ServiceRole.Counselor,
      ServiceRole.Psychiatrist,
    ];
    excludeRoles = [];
    capabilityNeeds = [
      CapabilityTag.PsychologicalCounseling,
      CapabilityTag.PsychiatryMedication,
      CapabilityTag.DepressionManagement,
      CapabilityTag.MentalHealth,
    ];
  } else if (psychiatryScore >= 5 && counselingScore < 3) {
    modality = CareModality.PsychiatryMedication;
    confidence = Math.min(0.9, 0.5 + psychiatryScore * 0.05);
    preferRoles = [ServiceRole.Psychiatrist];
    excludeRoles = [];
    capabilityNeeds = [
      CapabilityTag.PsychiatryMedication,
      CapabilityTag.MentalHealth,
      CapabilityTag.DepressionManagement,
    ];
  } else if (counselingScore + cbtScore >= 3) {
    modality =
      cbtScore >= 3 ? CareModality.PsychotherapyCbt : CareModality.PsychologicalCounseling;
    confidence = 0.65;
    preferRoles = [ServiceRole.ClinicalPsychologist, ServiceRole.Counselor];
    excludeRoles = [ServiceRole.Psychiatrist];
    rejectSummary.push("叙事更接近心理咨询/会谈，默认排除纯精神科");
    capabilityNeeds = [
      CapabilityTag.PsychologicalCounseling,
      CapabilityTag.Psychotherapy,
      CapabilityTag.DepressionManagement,
    ];
    if (cbtScore >= 2) capabilityNeeds.push(CapabilityTag.CBT);
  }

  const summary =
    modality === CareModality.Unclear
      ? "你的治疗方式意图还不够清楚：需要先确认是心理咨询/CBT，还是精神科药物路径。"
      : `已识别真实意图：${MODALITY_LABEL[modality]}` +
        (rejectSummary.length ? `（${rejectSummary.join("；")}）` : "");

  return {
    modality,
    confidence: Number(confidence.toFixed(2)),
    evidenceSpans: [...new Set(evidenceSpans)],
    summary,
    rejectSummary,
    preferRoles,
    excludeRoles,
    capabilityNeeds: [...new Set(capabilityNeeds)],
    skipModalityQuestion:
      confidence >= 0.75 &&
      modality !== CareModality.Unclear &&
      modality !== CareModality.Combined,
  };
}
