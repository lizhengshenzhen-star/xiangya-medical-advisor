import type {
  ConstraintProfile,
  DecisionStageId,
  DiseaseArea,
  NarrativeParseResult,
} from "../models/types";
import { recognizeTrueIntent } from "./trueIntentEngine";

const emptyConstraints = (): ConstraintProfile => ({
  outOfTown: false,
  firstVisit: false,
  timeTight: false,
  budgetPressure: false,
  preferCommunication: false,
  preferRecoverySpeed: false,
  preferLessTravel: false,
});

/**
 * 叙事解析层
 * 工作流顺序：真实意图 → 疾病方向/阶段/约束（不做诊断）
 */
export function parseNarrative(text: string): NarrativeParseResult {
  const t = text.trim();
  const lower = t;
  const rawSignals: string[] = [];
  const emotionalCues: string[] = [];
  const riskSignals: string[] = [];
  const gapsToAsk: string[] = [];
  const stageScores: Partial<Record<DecisionStageId, number>> = {};

  // ① 第一层：真实意图（咨询 vs 精神科等）
  const intent = recognizeTrueIntent(t);
  rawSignals.push(`真实意图：${intent.modality}（置信 ${intent.confidence}）`);
  if (intent.evidenceSpans.length) {
    rawSignals.push(`意图证据：${intent.evidenceSpans.join(" / ")}`);
  }

  const bump = (id: DecisionStageId, n = 1) => {
    stageScores[id] = (stageScores[id] || 0) + n;
  };

  let diseaseArea: DiseaseArea = "general";
  if (/肺|结节|咳嗽|气促|呼吸|胸片|CT/.test(lower)) {
    diseaseArea = "lung";
    rawSignals.push("提及呼吸/肺部相关");
  } else if (/心脏|胸闷|血压|冠心病|心慌/.test(lower)) {
    diseaseArea = "heart";
    rawSignals.push("提及心血管相关");
  } else if (/胃|肠|肝|胆|消化|反酸|腹痛/.test(lower)) {
    diseaseArea = "gi";
    rawSignals.push("提及消化相关");
  } else if (/头[晕痛]|癫痫|肢体麻木|神经/.test(lower)) {
    diseaseArea = "neuro";
    rawSignals.push("提及神经相关");
  } else if (/腰椎|颈椎|关节|骨折|骨科|膝盖/.test(lower)) {
    diseaseArea = "ortho";
    rawSignals.push("提及骨科相关");
  } else if (
    /抑郁|焦虑|失眠|情绪|心理|不开心|不想吃药|CBT|心理治疗|心理咨询|认知行为|精神科/.test(
      lower
    )
  ) {
    diseaseArea = "mental";
    rawSignals.push("提及精神心理相关");
  }

  if (/担心|害怕|焦虑|慌|怕耽误|会不会是癌/.test(lower)) {
    emotionalCues.push("害怕耽误或结果不确定");
  }
  if (/白跑|奔波|来回|外地|舟车|长沙/.test(lower)) {
    emotionalCues.push("对奔波与成本敏感");
  }
  if (/没好转|没有效果|一直吃药|治不好|反复/.test(lower)) {
    emotionalCues.push("对现有路径效果失望");
    bump("treatment_choice", 2);
    bump("long_term_management", 1);
  }
  if (
    intent.modality === "psychological_counseling" ||
    intent.modality === "psychotherapy_cbt" ||
    /不想只吃药|不要只开药|想做心理|CBT|谈话治疗|心理咨询|心理治疗|认知行为|咨询师/.test(
      lower
    )
  ) {
    emotionalCues.push("希望非单纯药物路径");
    bump("long_term_management", 2);
  }
  if (/抑郁症|抑郁发作|抑郁情绪|抑郁/.test(lower)) {
    emotionalCues.push("抑郁相关困扰");
  }

  const constraints = emptyConstraints();
  if (/外地|外省|从外地|不在长沙|过来一趟/.test(lower)) {
    constraints.outOfTown = true;
    constraints.preferLessTravel = true;
  }
  if (/第一次|首次|没来过湘雅|第一次挂号/.test(lower)) {
    constraints.firstVisit = true;
  }
  if (/时间紧|只有一天|赶紧|尽快|马上/.test(lower)) {
    constraints.timeTight = true;
  }
  if (/费用|钱|贵|经济压力|医保/.test(lower)) {
    constraints.budgetPressure = true;
  }
  if (/讲清楚|沟通|愿意解释|听不懂/.test(lower)) {
    constraints.preferCommunication = true;
  }
  if (/微创|恢复快|创伤小|少开刀/.test(lower)) {
    constraints.preferRecoverySpeed = true;
    bump("surgery_decision", 2);
  }

  if (/还没查|不知道严不严重|要不要紧|会不会是/.test(lower)) {
    bump("risk_confirmation", 3);
  }
  if (/有报告|检查单|CT报告|看不懂报告|验单/.test(lower)) {
    bump("initial_diagnosis", 3);
  }
  if (/怎么治|方案|保守还是|要不要手术|纠结/.test(lower)) {
    bump("treatment_choice", 3);
  }
  if (/手术|开刀|微创|住院做/.test(lower)) {
    bump("surgery_decision", 3);
  }
  if (/长期|复诊|一直在治|吃药很久|心理治疗|心理咨询/.test(lower)) {
    bump("long_term_management", 3);
  }
  if (Object.keys(stageScores).length === 0) {
    bump("initial_diagnosis", 1);
    gapsToAsk.push("你目前是否已有检查报告，还是仍在担心阶段？");
  }

  if (/咯血|大出血|昏迷|抽搐不止|呼吸困难加重|胸痛剧烈|自杀|不想活/.test(lower)) {
    riskSignals.push(
      "叙事中出现需优先线下紧急就医的危险信号词，系统将弱化常规匹配并提示及时就医。"
    );
  }

  if (!constraints.outOfTown && !/本地|长沙|就在/.test(lower)) {
    gapsToAsk.push("你是否外地来长沙就医？这会影响路径规划。");
  }
  if (diseaseArea === "general") {
    gapsToAsk.push("能否补充更具体的身体部位或已有检查类型？");
  }
  if (!/医生|挂过|看过|就诊/.test(lower)) {
    gapsToAsk.push("你是否已经看过医生，还是第一次梳理路径？");
  }
  if (
    diseaseArea === "mental" &&
    !intent.skipModalityQuestion &&
    intent.modality === "unclear"
  ) {
    gapsToAsk.push("你更希望：心理咨询/CBT 会谈、精神科药物评估，还是两者结合？");
  }
  if ((stageScores.surgery_decision || 0) > 0 && !/微创|开放/.test(lower)) {
    gapsToAsk.push("目前是医生已建议手术，还是你自己在了解微创可能性？");
  }

  const stageCandidates = Object.entries(stageScores)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id as DecisionStageId);

  return {
    diseaseArea,
    emotionalCues: [...new Set(emotionalCues)],
    constraints,
    stageCandidates,
    riskSignals,
    gapsToAsk: [...new Set(gapsToAsk)].slice(0, 5),
    rawSignals,
    trueIntent: {
      modality: intent.modality,
      confidence: intent.confidence,
      summary: intent.summary,
      rejectSummary: intent.rejectSummary,
      evidenceSpans: intent.evidenceSpans,
      preferRoles: intent.preferRoles,
      excludeRoles: intent.excludeRoles,
      skipModalityQuestion: intent.skipModalityQuestion,
    },
  };
}
