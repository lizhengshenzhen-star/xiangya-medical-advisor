import type { IntentExtractResult } from "./intentExtractor";

export type FollowUpKind = "danger" | "ranking";

export interface MinimalFollowUpOption {
  id: string;
  label: string;
  /** 应用到排序偏置 */
  biasPatch: {
    preferSurgery?: boolean;
    preferCounseling?: boolean;
    preferCardiologyCheck?: boolean;
    confirmedFirstVisit?: boolean;
    escalateEmergency?: boolean;
  };
}

export interface MinimalFollowUpQuestion {
  id: string;
  kind: FollowUpKind;
  prompt: string;
  why: string;
  options: MinimalFollowUpOption[];
}

/**
 * 最多返回 0-2 个追问：仅危险分层或改变医生排序。
 * 禁止身高体重婚姻职业等无关项。
 */
export function buildMinimalFollowUps(
  intent: IntentExtractResult
): MinimalFollowUpQuestion[] {
  if (intent.urgency === "high" || intent.diseaseScenario === "急危重症") {
    return []; // 急诊场景：不再追问，直接行动
  }

  const qs: MinimalFollowUpQuestion[] = [];

  // A. 危险信号（心慌场景）
  if (
    /心慌|心跳|胸闷/.test(intent.raw) ||
    intent.dualPaths?.includes("心律失常排查")
  ) {
    qs.push({
      id: "danger_palpitation",
      kind: "danger",
      prompt: "心慌发作时有没有胸痛、大汗或差点晕倒？",
      why: "会改变是否优先心内科急症排查。",
      options: [
        {
          id: "yes_danger",
          label: "有胸痛 / 大汗 / 差点晕倒",
          biasPatch: { preferCardiologyCheck: true, escalateEmergency: true },
        },
        {
          id: "no_danger",
          label: "没有，主要是紧张、失眠或空心跳",
          biasPatch: { preferCounseling: true, preferCardiologyCheck: false },
        },
      ],
    });
  }

  // B. 排序：肺结节手术 vs 随访
  if (
    intent.diseaseScenario === "呼吸与胸部" &&
    /结节/.test(intent.raw) &&
    intent.visitGoal !== "surgery"
  ) {
    qs.push({
      id: "rank_nodule_goal",
      kind: "ranking",
      prompt: "你现在更想先做手术评估，还是先弄清要不要紧、怎么随访？",
      why: "会决定胸外科 vs 呼吸科优先级。",
      options: [
        {
          id: "want_surgery",
          label: "更想手术评估",
          biasPatch: { preferSurgery: true },
        },
        {
          id: "want_follow",
          label: "先评估风险与随访",
          biasPatch: { preferSurgery: false, confirmedFirstVisit: true },
        },
      ],
    });
  }

  // B. 精神心理：首次 vs 已就诊
  if (intent.diseaseScenario === "精神心理" && qs.length < 2) {
    qs.push({
      id: "rank_mental_goal",
      kind: "ranking",
      prompt: "这次更接近首次梳理，还是已经在服药/就诊、想调整方案？",
      why: "会影响专病门诊 vs 复诊随访型医生排序。",
      options: [
        {
          id: "first",
          label: "基本是首次系统就诊",
          biasPatch: { confirmedFirstVisit: true, preferCounseling: true },
        },
        {
          id: "follow",
          label: "已经看过/正在用药，想调整",
          biasPatch: { confirmedFirstVisit: false },
        },
      ],
    });
  }

  // 神经危象危险问（非已判定急诊时）
  if (
    /头晕|头痛/.test(intent.raw) &&
    !/结节|焦虑|失眠/.test(intent.raw) &&
    qs.length === 0
  ) {
    qs.push({
      id: "danger_neuro",
      kind: "danger",
      prompt: "是否突发肢体无力、说话含糊或意识不清？",
      why: "会决定是否立即急诊。",
      options: [
        {
          id: "yes",
          label: "有，突然出现",
          biasPatch: { escalateEmergency: true },
        },
        {
          id: "no",
          label: "没有，主要是缓慢不适",
          biasPatch: {},
        },
      ],
    });
  }

  return qs.slice(0, 2);
}
