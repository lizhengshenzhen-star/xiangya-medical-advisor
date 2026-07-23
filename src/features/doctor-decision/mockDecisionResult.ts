import type { DoctorDecisionResult } from "./types";
import { TherapyCapabilityTag } from "./types";
import { computeMatchScore, matchLevelFromScore } from "./matchScore";

const yaoBreakdown = {
  therapyOrientation: 96,
  diseaseMatch: 92,
  talkEvidence: 90,
  firstVisitFriendly: 88,
  bookingConvenience: 78,
};

const wuBreakdown = {
  therapyOrientation: 82,
  diseaseMatch: 90,
  talkEvidence: 84,
  firstVisitFriendly: 86,
  bookingConvenience: 80,
};

const zhangBreakdown = {
  therapyOrientation: 88,
  diseaseMatch: 80,
  talkEvidence: 86,
  firstVisitFriendly: 92,
  bookingConvenience: 88,
};

const yaoScore = computeMatchScore(yaoBreakdown);
const wuScore = computeMatchScore(wuBreakdown);
const zhangScore = computeMatchScore(zhangBreakdown);

/** 抑郁症 CBT / 长期会谈场景 mock */
export const mockDoctorDecisionResult: DoctorDecisionResult = {
  profile: {
    diseaseDirection: "精神心理",
    coreNeed: "抑郁症心理治疗",
    treatmentPreference: "认知行为治疗（CBT）",
    visitGoal: "长期会谈",
    riskLevel: "非急诊，可预约",
    confidencePercent: 92,
  },
  decisionSummary: [
    "更适合CBT心理治疗路径",
    "优先选择有心理治疗训练背景的医生",
    "当前最推荐：姚树桥",
  ],
  primaryDoctorName: "姚树桥",
  candidates: [
    {
      id: "xy2_counsel_ysq",
      role: "primary",
      name: "姚树桥",
      avatarInitials: "姚",
      hospital: "中南大学湘雅二医院",
      department: "精神卫生中心 · 心理咨询专科",
      title: "一级主任医师",
      academicLevel: "教授 / 博士生导师",
      matchScore: yaoScore,
      matchLevel: matchLevelFromScore(yaoScore),
      scoreBreakdown: yaoBreakdown,
      scoreExplain:
        "治疗取向与会谈证据拉高总分；预约便利性略低，故未到满分。若取向项降到 80，总分约 85。",
      capabilityTags: [
        TherapyCapabilityTag.CBT,
        TherapyCapabilityTag.Depression,
        TherapyCapabilityTag.Psychotherapy,
        TherapyCapabilityTag.LongTermTalk,
      ],
      personalizedReason:
        "你的需求是「抑郁+CBT+长期会谈」，该医生长期从事认知行为治疗与情绪障碍治疗，匹配需要系统学习情绪与认知调整的患者。",
      suitableFor: ["希望长期心理治疗", "想学习CBT技巧", "反复自我否定"],
      notIdealFor: ["需要紧急住院", "严重自杀风险未评估", "仅想快速开药"],
      bookingType: "心理咨询专科门诊",
      onlineSupported: true,
      scheduleStatus: "近窗口有号，建议尽早预约",
      bookingUrl: "https://www.haodf.com",
    },
    {
      id: "xy2_counsel_wdx",
      role: "alternative",
      name: "吴大兴",
      avatarInitials: "吴",
      hospital: "中南大学湘雅二医院",
      department: "心理咨询专科",
      title: "主任医师",
      academicLevel: "教授",
      matchScore: wuScore,
      matchLevel: matchLevelFromScore(wuScore),
      scoreBreakdown: wuBreakdown,
      scoreExplain:
        "疾病匹配与沟通解释分高；CBT 专指证据略低于主推荐，故作为强备选。",
      capabilityTags: [
        TherapyCapabilityTag.Depression,
        TherapyCapabilityTag.Anxiety,
        TherapyCapabilityTag.Psychotherapy,
        TherapyCapabilityTag.MedicationEval,
      ],
      personalizedReason:
        "若主推荐约不到号，他在情绪障碍评估与综合心理辅导上证据充分，更适合需要兼顾失眠/焦虑躯体化管理的备选路径。",
      suitableFor: ["主推荐约不到号", "抑郁伴焦虑失眠", "需要综合评估"],
      notIdealFor: ["只要纯CBT手册式训练", "急诊危机干预", "仅想开药复诊"],
      bookingType: "心理咨询专科门诊",
      onlineSupported: true,
      scheduleStatus: "近窗口有号",
      bookingUrl: "https://www.haodf.com",
    },
    {
      id: "xy2_hdf_4995462606",
      role: "styleAlternative",
      name: "张小崔",
      avatarInitials: "张",
      hospital: "中南大学湘雅二医院",
      department: "心理咨询专科",
      title: "副主任医师",
      academicLevel: "临床心理方向",
      matchScore: zhangScore,
      matchLevel: matchLevelFromScore(zhangScore),
      scoreBreakdown: zhangBreakdown,
      scoreExplain:
        "首诊友好与预约便利拉高；学术头衔权重低于主推荐，适合偏好温和沟通风格的患者。",
      capabilityTags: [
        TherapyCapabilityTag.Psychotherapy,
        TherapyCapabilityTag.FirstVisitFriendly,
        TherapyCapabilityTag.Depression,
        TherapyCapabilityTag.LongTermTalk,
      ],
      personalizedReason:
        "你若更看重温和沟通与首诊建立关系，该医生公开反馈偏耐心倾听，适合想先稳住会谈节奏、再深入CBT技术的路径。",
      suitableFor: ["偏好温和沟通", "首次建立治疗关系", "希望循序渐进"],
      notIdealFor: ["只要顶尖学术头衔", "复杂共病急评", "危机住院路径"],
      bookingType: "心理咨询专科门诊",
      onlineSupported: false,
      scheduleStatus: "近窗口出诊较密",
      bookingUrl: "https://www.haodf.com",
    },
  ],
  moreDoctors: [
    {
      id: "more_1",
      name: "同方向门诊医生",
      title: "主治/副主任医师",
      hospital: "湘雅二医院精神卫生中心",
    },
  ],
  whyNot: [
    {
      label: "吴大兴",
      betterFor: "更适合需要同时进行药物评估、失眠处理和焦虑躯体化管理的患者。",
    },
    {
      label: "普通精神科门诊",
      betterFor: "更适合快速诊断与处方，不一定适合连续CBT会谈。",
    },
  ],
};
