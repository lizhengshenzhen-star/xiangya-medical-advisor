import type {
  DynamicQuestion,
  NarrativeParseResult,
  StructuredNeeds,
  DecisionStageId,
  DiseaseArea,
} from "../models/types";
import { CapabilityTag } from "../models/types";
import { recognizeTrueIntent } from "./trueIntentEngine";

/**
 * 根据叙事动态生成追问。
 * 若真实意图已高置信（如明确要心理咨询），跳过治疗方式选择题，避免再混淆。
 */
export function generateDynamicQuestions(
  parse: NarrativeParseResult
): DynamicQuestion[] {
  const qs: DynamicQuestion[] = [];
  const intent = parse.trueIntent;

  if (
    parse.diseaseArea === "mental" &&
    !intent.skipModalityQuestion &&
    (intent.modality === "unclear" || intent.confidence < 0.75)
  ) {
    qs.push({
      id: "therapy_pref",
      prompt: "先确认真实意图：你要的是哪一种？（精神科 ≠ 心理咨询）",
      why: "工作流必须先锁定服务形态，再谈医院与科室",
      options: [
        {
          id: "cbt",
          label: "心理咨询 / CBT 会谈（不要只挂精神科开药）",
          patch: {
            capabilityNeeds: [
              CapabilityTag.PsychologicalCounseling,
              CapabilityTag.Psychotherapy,
              CapabilityTag.CBT,
              CapabilityTag.DepressionManagement,
            ],
            trueIntent: {
              ...intent,
              modality: "psychotherapy_cbt",
              confidence: 0.9,
              summary: "用户确认：心理咨询/CBT，非纯精神科",
              rejectSummary: ["不匹配纯精神科开药路径"],
              preferRoles: ["clinical_psychologist", "counselor"],
              excludeRoles: ["psychiatrist"],
              skipModalityQuestion: true,
            },
          },
        },
        {
          id: "combine",
          label: "精神科评估 + 心理干预结合",
          patch: {
            capabilityNeeds: [
              CapabilityTag.PsychiatryMedication,
              CapabilityTag.PsychologicalCounseling,
              CapabilityTag.DepressionManagement,
              CapabilityTag.MentalHealth,
            ],
            trueIntent: {
              ...intent,
              modality: "combined",
              confidence: 0.9,
              summary: "用户确认：联合路径",
              rejectSummary: [],
              preferRoles: ["clinical_psychologist", "counselor", "psychiatrist"],
              excludeRoles: [],
              skipModalityQuestion: true,
            },
          },
        },
        {
          id: "med_adjust",
          label: "主要需要精神科药物评估/调整",
          patch: {
            capabilityNeeds: [
              CapabilityTag.PsychiatryMedication,
              CapabilityTag.MentalHealth,
              CapabilityTag.DepressionManagement,
            ],
            trueIntent: {
              ...intent,
              modality: "psychiatry_medication",
              confidence: 0.9,
              summary: "用户确认：精神科药物路径",
              rejectSummary: [],
              preferRoles: ["psychiatrist"],
              excludeRoles: [],
              skipModalityQuestion: true,
            },
          },
        },
      ],
    });
  }

  qs.push({
    id: "confirm_stage",
    prompt: "结合你刚说的情况，哪一句更接近你现在的位置？",
    why: "决策阶段决定匹配能力，而不是职称",
    options: [
      {
        id: "risk",
        label: "还没系统查清，主要是担心要不要紧",
        patch: { stageCandidates: ["risk_confirmation"] as DecisionStageId[] },
      },
      {
        id: "initial",
        label: "已有检查/报告，想弄懂和下一步去哪",
        patch: { stageCandidates: ["initial_diagnosis"] as DecisionStageId[] },
      },
      {
        id: "plan",
        label: "已有初步意见，正在纠结怎么治",
        patch: { stageCandidates: ["treatment_choice"] as DecisionStageId[] },
      },
      {
        id: "surgery",
        label: "已谈到手术/微创，还在犹豫",
        patch: { stageCandidates: ["surgery_decision"] as DecisionStageId[] },
      },
      {
        id: "manage",
        label: "需要长期管理或心理治疗关系",
        patch: { stageCandidates: ["long_term_management"] as DecisionStageId[] },
      },
    ],
  });

  if (
    parse.diseaseArea === "general" ||
    parse.gapsToAsk.some((g) => g.includes("身体部位"))
  ) {
    qs.push({
      id: "confirm_area",
      prompt: "如果只能选一个大方向，你更接近哪一类？",
      why: "用于收窄科室能力画像，不是确诊",
      options: [
        { id: "lung", label: "肺/呼吸相关", patch: { diseaseArea: "lung" as DiseaseArea } },
        { id: "heart", label: "心脏/血压相关", patch: { diseaseArea: "heart" as DiseaseArea } },
        { id: "gi", label: "胃肠肝胆消化", patch: { diseaseArea: "gi" as DiseaseArea } },
        { id: "neuro", label: "头痛头晕/神经", patch: { diseaseArea: "neuro" as DiseaseArea } },
        { id: "ortho", label: "骨科关节脊柱", patch: { diseaseArea: "ortho" as DiseaseArea } },
        { id: "mental", label: "情绪睡眠/心理", patch: { diseaseArea: "mental" as DiseaseArea } },
        {
          id: "general",
          label: "仍不确定，先理路径",
          patch: { diseaseArea: "general" as DiseaseArea },
        },
      ],
    });
  }

  if (
    parse.stageCandidates[0] === "surgery_decision" ||
    parse.constraints.preferRecoverySpeed
  ) {
    qs.push({
      id: "surgery_focus",
      prompt: "手术相关决策里，你现在最需要先搞清哪一件？",
      why: "避免只问「谁刀法好」而忽略适应证",
      options: [
        {
          id: "indication",
          label: "我到底适不适合现在做",
          patch: { capabilityNeeds: [CapabilityTag.SurgeryDecision] },
        },
        {
          id: "minimally",
          label: "有没有微创可能、恢复大概怎样",
          patch: {
            capabilityNeeds: [
              CapabilityTag.MinimallyInvasive,
              CapabilityTag.SurgeryDecision,
            ],
          },
        },
        {
          id: "conservative",
          label: "能否先保守观察一段时间",
          patch: { capabilityNeeds: [CapabilityTag.ConservativeTreatment] },
        },
      ],
    });
  }

  qs.push({
    id: "constraints",
    prompt: "现实约束里，哪些对你是真的卡点？（可多选）",
    why: "约束决定路径，而不是只决定「挂谁」",
    multi: true,
    options: [
      {
        id: "out",
        label: "外地来一趟不容易",
        patch: {
          constraints: {
            ...parse.constraints,
            outOfTown: true,
            preferLessTravel: true,
          },
        },
      },
      {
        id: "time",
        label: "时间紧，希望一次把路径理清",
        patch: { constraints: { ...parse.constraints, timeTight: true } },
      },
      {
        id: "budget",
        label: "费用压力较大",
        patch: { constraints: { ...parse.constraints, budgetPressure: true } },
      },
      {
        id: "talk",
        label: "更看重医生是否讲得清楚",
        patch: {
          constraints: { ...parse.constraints, preferCommunication: true },
        },
      },
      {
        id: "first",
        label: "第一次来湘雅，流程不熟",
        patch: { constraints: { ...parse.constraints, firstVisit: true } },
      },
    ],
  });

  qs.push({
    id: "priority",
    prompt: "如果只能优先一件事，你更看重？",
    why: "决定匹配权重：能力 / 流程 / 沟通 / 成本",
    options: [
      {
        id: "effect",
        label: "把事情查清、方案靠谱",
        patch: { priorityWeights: { capability: 3, process: 1, talk: 1, cost: 0 } },
      },
      {
        id: "less_run",
        label: "少跑医院、路径清楚",
        patch: { priorityWeights: { capability: 1, process: 3, talk: 1, cost: 1 } },
      },
      {
        id: "talk",
        label: "沟通解释清楚",
        patch: { priorityWeights: { capability: 1, process: 1, talk: 3, cost: 0 } },
      },
      {
        id: "cost",
        label: "控制费用与奔波成本",
        patch: { priorityWeights: { capability: 1, process: 2, talk: 0, cost: 3 } },
      },
    ],
  });

  return qs.slice(0, 5);
}

export function applyQuestionPatch(
  base: StructuredNeeds,
  patch: Partial<StructuredNeeds> | Record<string, unknown>
): StructuredNeeds {
  const next: StructuredNeeds = {
    ...base,
    constraints: { ...base.constraints },
    capabilityNeeds: [...base.capabilityNeeds],
    stageCandidates: [...base.stageCandidates],
    emotionalCues: [...base.emotionalCues],
    riskSignals: [...base.riskSignals],
    priorityWeights: { ...base.priorityWeights },
    trueIntent: base.trueIntent ? { ...base.trueIntent } : undefined,
  };

  const p = patch as Partial<StructuredNeeds>;
  if (p.diseaseArea) next.diseaseArea = p.diseaseArea;
  if (p.stageCandidates) next.stageCandidates = p.stageCandidates;
  if (p.capabilityNeeds) {
    next.capabilityNeeds = [
      ...new Set([...next.capabilityNeeds, ...p.capabilityNeeds]),
    ];
  }
  if (p.constraints) next.constraints = { ...next.constraints, ...p.constraints };
  if (p.priorityWeights) next.priorityWeights = p.priorityWeights;
  if (p.trueIntent) {
    next.trueIntent = { ...(next.trueIntent || {}), ...p.trueIntent } as StructuredNeeds["trueIntent"];
  }
  return next;
}

export function needsFromParse(parse: NarrativeParseResult): StructuredNeeds {
  return {
    diseaseArea: parse.diseaseArea,
    emotionalCues: parse.emotionalCues,
    constraints: parse.constraints,
    stageCandidates: parse.stageCandidates,
    riskSignals: parse.riskSignals,
    capabilityNeeds: [...new Set(capabilitiesFromIntent(parse))],
    trueIntent: parse.trueIntent,
    priorityWeights: { capability: 3, process: 1, talk: 1, cost: 0 },
  };
}

function capabilitiesFromIntent(parse: NarrativeParseResult): CapabilityTag[] {
  const m = parse.trueIntent.modality;
  if (m === "psychological_counseling" || m === "psychotherapy_cbt") {
    const tags: CapabilityTag[] = [
      CapabilityTag.PsychologicalCounseling,
      CapabilityTag.Psychotherapy,
      CapabilityTag.DepressionManagement,
    ];
    if (m === "psychotherapy_cbt" || /CBT|认知行为/.test(parse.rawSignals.join(""))) {
      tags.push(CapabilityTag.CBT);
    }
    return tags;
  }
  if (m === "psychiatry_medication") {
    return [
      CapabilityTag.PsychiatryMedication,
      CapabilityTag.MentalHealth,
      CapabilityTag.DepressionManagement,
    ];
  }
  if (m === "combined") {
    return [
      CapabilityTag.PsychologicalCounseling,
      CapabilityTag.PsychiatryMedication,
      CapabilityTag.DepressionManagement,
      CapabilityTag.MentalHealth,
    ];
  }
  return recognizeTrueIntent(parse.rawSignals.join(" ")).capabilityNeeds;
}
