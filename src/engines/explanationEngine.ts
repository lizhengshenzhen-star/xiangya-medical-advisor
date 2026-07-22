import type {
  ActionPriorityItem,
  AiDecision,
  MatchedDoctor,
  StructuredNeeds,
  DecisionStage,
  CapabilityTag,
  EngineTrace,
  PathDifferentiation,
  ShareableReport,
  TenSecondSummary,
  HospitalVisitDecision,
} from "../models/types";
import { CAPABILITY_LABELS, HospitalCampus } from "../models/types";
import {
  MEDICAL_DISCLAIMER,
  sanitizeMedicalText,
  safeMatchWording,
} from "../safety/medicalBoundary";

const MATERIALS: Record<string, string[]> = {
  lung: ["身份证/医保卡", "胸部 CT（尽量带影像）", "近期化验", "外院病历摘要"],
  heart: ["身份证/医保卡", "心电图/动态心电", "心脏超声或 CTA", "用药清单"],
  gi: ["身份证/医保卡", "内镜与病理报告", "腹部影像", "过敏史"],
  neuro: ["身份证/医保卡", "头颅影像", "症状日记", "用药清单"],
  ortho: ["身份证/医保卡", "X光/CT/MRI", "外院手术记录（如有）", "症状与活动受限说明"],
  mental: [
    "身份证/医保卡",
    "既往精神心理/咨询病历摘要（如有）",
    "用药史与副作用记录",
    "想确认的 3 个问题：是否做 CBT 会谈、排期、费用",
  ],
  general: ["身份证/医保卡", "已有检查报告", "症状时间线一页纸", "想问医生的 3 个问题"],
};

function pathDiffFor(doc: MatchedDoctor): PathDifferentiation {
  if (!doc.isPathCard && (doc.serviceRole === "clinical_psychologist" || doc.serviceRole === "counselor")) {
    if (doc.hospitalCampus === HospitalCampus.Xiangya2) {
      return {
        doctorId: doc.id,
        betterFor: "明确要心理咨询/会谈、尤其关注抑郁相关心理治疗的人；附二心理咨询专科资源较集中。",
        lessSuitableFor: "只想快速开药调药、不打算建立会谈治疗关系的人。",
      };
    }
    if (doc.hospitalCampus === HospitalCampus.Xiangya) {
      return {
        doctorId: doc.id,
        betterFor: "希望在湘雅本院建立会谈治疗关系的人。",
        lessSuitableFor: "只想快速调整药物方案的人。",
      };
    }
  }
  if (doc.hospitalCampus === HospitalCampus.Xiangya) {
    return {
      doctorId: doc.id,
      betterFor: "明确想做心理治疗/会谈、希望首次把治疗关系建立对的人。",
      lessSuitableFor: "只想快速调整药物方案、不打算做会谈治疗的人。",
    };
  }
  if (doc.hospitalCampus === HospitalCampus.Xiangya2) {
    return {
      doctorId: doc.id,
      betterFor: "既往接触过精神科/治疗经历较多、需要更丰富临床心理资源的人。",
      lessSuitableFor: "只想做一次短期咨询、不愿核对门诊项目是否为治疗时段的人。",
    };
  }
  return {
    doctorId: doc.id,
    betterFor: "与当前能力方向较接近的人。",
    lessSuitableFor: "诉求与该路径服务形态明显不符的人。",
  };
}

function buildActionPriorities(
  matched: MatchedDoctor[],
  needs: StructuredNeeds,
  hospital?: HospitalVisitDecision
): { items: ActionPriorityItem[]; basis: string } {
  if (hospital?.urgency === "emergency") {
    return {
      items: [
        {
          rank: 1,
          title: `${hospital.primaryHospital.replace("中南大学", "")} · 急诊科`,
          reason:
            hospital.emergencyAction ||
            "急危重症场景：立即急诊，不要等待普通门诊。",
        },
        {
          rank: 2,
          title: "就近可更快送达的急诊通道",
          reason: "就近可及性优先于院区偏好；途中勿拖延。",
        },
        {
          rank: 3,
          title: "到达后说明突发时间线与用药",
          reason: "便于急诊快速分诊，而非纠结挂哪位专家号。",
        },
      ],
      basis:
        "排序依据：急危重症优先急诊可达性；医院相对优势仅作参考，不替代就近原则。",
    };
  }

  const top = matched.slice(0, 3);
  const counseling =
    needs.trueIntent?.modality === "psychotherapy_cbt" ||
    needs.trueIntent?.modality === "psychological_counseling";

  const reasonByCampus: Record<string, string> = {
    xiangya: counseling
      ? "在当前公开信息下，更贴近「会谈/CBT」诉求，有助于降低挂到纯药物管理门诊的概率。"
      : "在当前公开信息下，与你的能力需求贴合度相对更高。",
    xiangya2: counseling
      ? "附二心理咨询专科/临床心理资源相对集中；更建议挂号前确认是否安排心理治疗（会谈）时段。"
      : "资源相对充足，可作为并行核验的次优或首选路径。",
  };

  const items: ActionPriorityItem[] = [];
  if (hospital?.hasClearAdvantage) {
    items.push({
      rank: 1,
      title: hospital.primaryDisplayLabel,
      reason: hospital.reasons.slice(0, 2).join("；"),
    });
  }

  for (const doc of top) {
    if (items.length >= 3) break;
    items.push({
      rank: (items.length + 1) as 1 | 2 | 3,
      title: `${doc.hospital.replace("中南大学", "")}${doc.department ? ` · ${doc.department}` : ""}`,
      reason:
        reasonByCampus[doc.hospitalCampus] ||
        "在当前公开信息下，与你的阶段需求相对匹配，建议进一步与门诊确认。",
    });
  }

  while (items.length < 3) {
    items.push({
      rank: (items.length + 1) as 1 | 2 | 3,
      title: "待补充路径",
      reason: "公开可匹配路径不足，更建议先确认院区对口门诊后再挂号。",
    });
  }

  // re-rank
  const normalized = items.slice(0, 3).map((p, idx) => ({
    ...p,
    rank: (idx + 1) as 1 | 2 | 3,
  }));

  const basis = hospital?.hasClearAdvantage
    ? "排序依据：先医院相对优势，再科室/医生能力匹配；不按网络热度排序。"
    : counseling
      ? "排序依据：真实意图（心理咨询/CBT）优先于医院名气；会谈治疗可达性优先于精神科职称。"
      : "排序依据：当前决策阶段能力匹配优先，其次流程可达与备选弹性；不按网络热度排序。";

  return { items: normalized, basis };
}

function buildTenSecondSummary(
  needs: StructuredNeeds,
  priorities: ActionPriorityItem[],
  hospital?: HospitalVisitDecision
): TenSecondSummary {
  if (hospital?.urgency === "emergency") {
    const items: [string, string, string] = [
      "这是急危重症取向：优先急诊，不要等普通门诊号。",
      `优先就近可及的急症通道（参考：${hospital.primaryHospital}）。`,
      hospital.emergencyAction || "立即前往急诊，携带身份证件与用药清单。",
    ];
    return {
      items,
      charCount: items.join("").length,
    };
  }

  const counseling =
    needs.trueIntent?.modality === "psychotherapy_cbt" ||
    needs.trueIntent?.modality === "psychological_counseling";

  const hospitalLine = hospital?.hasClearAdvantage
    ? `医院优先：${hospital.primaryHospital.replace("中南大学", "")}（相对优势已判定）。`
    : priorities[0]
      ? `行动优先：${priorities[0].title}。`
      : "先确认对口科室，再选医生。";

  const items: [string, string, string] = [
    hospitalLine,
    counseling
      ? "诉求偏心理咨询/会谈时，优先咨询类门诊，避免默认精神科开药号。"
      : priorities[1]
        ? `次优先参考：${priorities[1].title}。`
        : "带着已有材料完成规范首诊更重要。",
    hospital?.whyNotAlternative
      ? `为何不先选另一家：${hospital.whyNotAlternative.slice(0, 42)}${hospital.whyNotAlternative.length > 42 ? "…" : ""}`
      : priorities[2]
        ? `备选：${priorities[2].title}。`
        : "号源与出诊以官方平台为准。",
  ];
  return { items, charCount: items.join("").length };
}

/**
 * explanationEngine：规则结果 → 可行动的顾问表达
 */
export function explainDecision(input: {
  realProblem: string;
  emotionalSummary: string;
  whyWasteTrip: string;
  commonPitfall: string;
  stage: DecisionStage;
  stageDisplayLabel: string;
  stageConfidence: number;
  needs: StructuredNeeds;
  capabilityNeeds: CapabilityTag[];
  matched: MatchedDoctor[];
  rankingHints: string[];
  constraintFlags: string[];
  engineTrace: EngineTrace;
  hospitalDecision?: HospitalVisitDecision;
}): AiDecision {
  const hospitalDecision = input.hospitalDecision;
  const nextSteps = buildNextSteps(
    input.stage,
    input.needs,
    input.constraintFlags,
    hospitalDecision
  );
  const { items: actionPriorities, basis: priorityBasis } = buildActionPriorities(
    input.matched,
    input.needs,
    hospitalDecision
  );
  const tenSecondSummary = buildTenSecondSummary(
    input.needs,
    actionPriorities,
    hospitalDecision
  );
  const pathDifferentiations = input.matched.map(pathDiffFor);

  const rankingLogic = [
    ...input.rankingHints,
    `当前阶段判定为「${input.stageDisplayLabel}」（置信 ${input.stageConfidence}），阶段权重大于单纯职称。`,
    priorityBasis,
    "无充分公开证据的能力会标为不确定，避免过度承诺。",
  ];

  const uncertainties = [
    "线上匹配不能替代面诊，是否适合某医生/治疗师需线下确认。",
    "出诊时间、院区、号源以官方挂号渠道为准。",
    "医院相对优势为路径参考，不构成官方排名或疗效承诺。",
    ...input.matched.map((d) => `${d.name}：${d.uncertainty}`),
  ].slice(0, 6);

  const materials = [...MATERIALS[input.needs.diseaseArea]];
  const capabilityNeedLabels = input.capabilityNeeds.map((t) => CAPABILITY_LABELS[t]);

  const shareableSections: ShareableReport = {
    tenSecondSummary,
    realProblem: sanitizeMedicalText(input.realProblem).text,
    whyWasteTrip: sanitizeMedicalText(input.whyWasteTrip).text,
    nextSteps,
    capabilityDirections: capabilityNeedLabels,
    actionPriorities,
    priorityBasis,
    candidates: input.matched.map((d) => {
      const diff = pathDifferentiations.find((x) => x.doctorId === d.id)!;
      return {
        name: d.name,
        hospital: d.hospital,
        department: `${d.department}（${
          d.serviceRole === "psychiatrist"
            ? "精神科路径"
            : d.serviceRole === "counselor" ||
                d.serviceRole === "clinical_psychologist"
              ? "心理咨询/临床心理路径"
              : "专科路径"
        }）`,
        matchLevel: d.matchLevel,
        evidence: d.evidence,
        why: d.matchReasons.join("；") || safeMatchWording(d.matchLevel),
        betterFor: diff.betterFor,
        lessSuitableFor: diff.lessSuitableFor,
      };
    }),
    rankingLogic: rankingLogic.map((s) => sanitizeMedicalText(s).text),
    uncertainties,
    materials,
    hospitalDecisionMarkdown: hospitalDecision?.markdown,
  };

  return {
    realProblem: shareableSections.realProblem,
    emotionalSummary: sanitizeMedicalText(input.emotionalSummary).text,
    stage: input.stage,
    stageDisplayLabel: input.stageDisplayLabel,
    stageConfidence: input.stageConfidence,
    nextSteps,
    capabilityNeeds: input.capabilityNeeds,
    capabilityNeedLabels,
    matchedDoctors: input.matched,
    rankingLogic: shareableSections.rankingLogic,
    uncertainties,
    materials,
    whyEasyToWasteTrip: shareableSections.whyWasteTrip,
    commonPitfall: sanitizeMedicalText(input.commonPitfall).text,
    tenSecondSummary,
    actionPriorities,
    priorityBasis,
    pathDifferentiations,
    shareableSections,
    engineTrace: input.engineTrace,
    hospitalDecision,
  };
}

function buildNextSteps(
  stage: DecisionStage,
  needs: StructuredNeeds,
  flags: string[],
  hospital?: HospitalVisitDecision
): string[] {
  if (hospital?.urgency === "emergency") {
    return [
      hospital.emergencyAction ||
        "立即前往就近急诊，不要等待普通门诊号源。",
      `优先参考院区：${hospital.primaryHospital}（仍以最快可达为准）。`,
      "到达后说明突发时间、伴随症状与正在服用的药物。",
    ].map((s) => sanitizeMedicalText(s).text);
  }

  const steps: string[] = [];
  const counseling =
    needs.trueIntent?.modality === "psychotherapy_cbt" ||
    needs.trueIntent?.modality === "psychological_counseling";

  if (hospital?.hasClearAdvantage) {
    steps.push(
      `优先考虑 ${hospital.primaryHospital}：${hospital.suggestedDepartments[0] || "对口专科"}。`
    );
  }

  if (counseling) {
    steps.push("按优先级先挂临床心理/会谈类门诊，而不是默认精神科专家号。");
    steps.push("挂号或预约时明确问：是否提供 CBT/认知行为会谈。");
  } else {
    switch (stage.id) {
      case "risk_confirmation":
        steps.push("先完成与症状对应的基础评估，而不是直接锁定外地顶级专家号。");
        steps.push("整理症状时间线：何时开始、加重因素、已处理过什么。");
        break;
      case "initial_diagnosis":
        steps.push("带着已有报告/影像，按匹配科室完成规范首诊。");
        steps.push("问诊重点确认：还缺哪些检查、复查窗口、危险信号。");
        break;
      case "treatment_choice":
        steps.push("列出 2–3 个方案差异问题：预期、风险、费用、恢复。");
        steps.push("优先匹配「做过这类方案决策」的能力方向，而非只看职称。");
        break;
      case "surgery_decision":
        steps.push("先确认：是否具备指征、微创可能性、开放备选、康复周期。");
        steps.push("很多人容易在这一步只问术者名气，却忽略适应证本身。");
        break;
      default:
        steps.push("明确长期目标：症状控制、功能恢复，或建立心理治疗关系。");
        steps.push("选择便于持续随访、治疗取向匹配的医生，而非一次性专家号。");
    }
  }

  if (flags.includes("外地患者") || flags.includes("希望少奔波")) {
    steps.push("外地患者：出发前确认出诊日与材料，尽量合并检查与看报告行程。");
  }
  return steps.slice(0, 3).map((s) => sanitizeMedicalText(s).text);
}

export function toShareableMarkdown(decision: AiDecision): string {
  const s = decision.shareableSections;
  const lines: string[] = [
    "【医策 · 个人医疗决策报告】",
    "",
    MEDICAL_DISCLAIMER,
    "",
  ];

  if (
    decision.hospitalDecision?.hasClearAdvantage ||
    decision.hospitalDecision?.urgency === "emergency"
  ) {
    lines.push(decision.hospitalDecision.markdown, "");
  }

  lines.push(
    "【你现在最需要知道的3件事】",
    ...s.tenSecondSummary.items.map((x, i) => `${i + 1}. ${x}`),
    "",
    "【倾听摘要】",
    decision.emotionalSummary,
    "",
    "【你真正需要解决的问题】",
    s.realProblem,
    "",
    "【当前决策阶段】",
    `${decision.stageDisplayLabel} · 置信 ${decision.stageConfidence}`,
    "",
    "【如果你明天就要去医院，我会这样排优先级】",
    `排序依据：${s.priorityBasis}`,
    ...s.actionPriorities.map(
      (p) => `第${p.rank}优先：${p.title}\n原因：${p.reason}`
    ),
    "",
    "【为什么很多人会在这一步白跑】",
    s.whyWasteTrip,
    "",
    "【更适合关注的医生能力方向】",
    ...s.capabilityDirections.map((x) => `· ${x}`),
    "",
    "【候选路径与差异】"
  );
  s.candidates.forEach((c, i) => {
    lines.push(
      `${i + 1}. ${c.name}｜${c.hospital} · ${c.department}`,
      `   公开信息显示：${c.evidence}`,
      `   为什么匹配：${c.why}`,
      `   更适合：${c.betterFor}`,
      `   不太适合：${c.lessSuitableFor}`,
      ""
    );
  });
  lines.push(
    "【不确定性说明】",
    ...s.uncertainties.map((x) => `· ${x}`),
    "",
    "【带去医院的资料清单】",
    ...s.materials.map((x) => `· ${x}`),
    "",
    "— 生成说明：先医院相对优势，再科室/医生；请以医院官方信息为准。"
  );
  return lines.join("\n");
}
