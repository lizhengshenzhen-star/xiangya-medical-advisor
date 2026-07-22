import {
  CAPABILITY_LABELS,
  CapabilityTag,
  type DoctorProfile,
  type MatchLevel,
  type MatchedDoctor,
  type StructuredNeeds,
  type DecisionStageId,
} from "../models/types";
import { scheduleBoostForDoctor } from "../data/schedules";

function wantsCounselingPath(capabilityNeeds: CapabilityTag[]): boolean {
  return (
    capabilityNeeds.includes(CapabilityTag.PsychologicalCounseling) ||
    capabilityNeeds.includes(CapabilityTag.Psychotherapy) ||
    capabilityNeeds.includes(CapabilityTag.CBT) ||
    capabilityNeeds.includes(CapabilityTag.ACT)
  );
}

function wantsPsychiatryMeds(capabilityNeeds: CapabilityTag[]): boolean {
  return capabilityNeeds.includes(CapabilityTag.PsychiatryMedication);
}

/** 有优先院区时：优先堆叠该院；否则在分数接近时覆盖湘雅/附二 */
function pickTopWithCampusDiversity(
  scored: MatchedDoctor[],
  limit = 3,
  preferredCampus?: DoctorProfile["hospitalCampus"]
): MatchedDoctor[] {
  if (scored.length <= limit) return scored;

  if (preferredCampus) {
    const preferred = scored.filter((d) => d.hospitalCampus === preferredCampus);
    const others = scored.filter((d) => d.hospitalCampus !== preferredCampus);
    const selected: MatchedDoctor[] = [];
    for (const doc of preferred) {
      if (selected.length >= limit) break;
      selected.push(doc);
    }
    for (const doc of others) {
      if (selected.length >= limit) break;
      selected.push(doc);
    }
    return selected.slice(0, limit);
  }

  const selected: MatchedDoctor[] = [];
  const usedCampus = new Set<string>();

  selected.push(scored[0]);
  usedCampus.add(scored[0].hospitalCampus);

  for (const doc of scored.slice(1)) {
    if (selected.length >= limit) break;
    const topScore = selected[0].score;
    if (!usedCampus.has(doc.hospitalCampus) && doc.score >= topScore - 8) {
      selected.push(doc);
      usedCampus.add(doc.hospitalCampus);
    }
  }

  for (const doc of scored) {
    if (selected.length >= limit) break;
    if (!selected.find((s) => s.id === doc.id)) selected.push(doc);
  }

  return selected.slice(0, limit);
}

export function matchDoctors(params: {
  doctors: DoctorProfile[];
  needs: StructuredNeeds;
  stageId: DecisionStageId;
  capabilityNeeds: CapabilityTag[];
  processBoost: number;
  /** 医院优势层给出的优先院区 */
  preferredCampus?: DoctorProfile["hospitalCampus"];
  /** 急危重症：弱化普通门诊医生推荐 */
  emergencyMode?: boolean;
}): {
  matched: MatchedDoctor[];
  trace: Array<{ doctorId: string; score: number; reasons: string[] }>;
} {
  const {
    doctors,
    needs,
    stageId,
    capabilityNeeds,
    processBoost,
    preferredCampus,
    emergencyMode,
  } = params;
  const w = needs.priorityWeights;
  const counseling = wantsCounselingPath(capabilityNeeds);
  const psychiatryMeds = wantsPsychiatryMeds(capabilityNeeds);

  const scored = doctors.map((doc) => {
    let score = 0;
    const reasons: string[] = [];

    if (preferredCampus && doc.hospitalCampus === preferredCampus) {
      score += emergencyMode ? 2 : 8;
      reasons.push(
        `医院相对优势优先院区：${
          preferredCampus === "xiangya2" ? "湘雅二医院" : "湘雅医院"
        }`
      );
    } else if (preferredCampus && doc.hospitalCampus !== preferredCampus) {
      score -= emergencyMode ? 1 : 4;
    }

    for (const tag of doc.capabilityTags) {
      if (capabilityNeeds.includes(tag)) {
        const weight =
          tag === CapabilityTag.CBT ||
          tag === CapabilityTag.PsychologicalCounseling ||
          tag === CapabilityTag.Psychotherapy
            ? 5
            : 3;
        score += weight * w.capability;
        reasons.push(`能力方向匹配：${CAPABILITY_LABELS[tag]}`);
      }
    }

    if (stageId === "surgery_decision" && doc.surgeryPreference) {
      score += 4;
      reasons.push("能力画像偏手术决策，贴合当前阶段");
    }
    if (
      (stageId === "risk_confirmation" || stageId === "initial_diagnosis") &&
      doc.firstVisitFriendly
    ) {
      score += 3;
      reasons.push("适合首次建立就诊关系");
    }
    if (stageId === "long_term_management" && doc.conservativePreference) {
      score += 2;
      reasons.push("偏长期/保守管理取向可参考");
    }
    if (
      stageId === "treatment_choice" &&
      (doc.capabilityTags.includes(CapabilityTag.ComplexEvaluation) ||
        doc.capabilityTags.includes(CapabilityTag.ConservativeTreatment))
    ) {
      score += 3;
      reasons.push("适合方案选择讨论");
    }

    if (doc.externalPatientFriendly) {
      score += processBoost + w.process;
      if (needs.constraints.outOfTown) {
        reasons.push("对外地患者流程友好有公开/维护标记");
      }
    }
    if (doc.communicationStyle === "explanatory") {
      score += w.talk * 2;
      if (w.talk >= 2) reasons.push("沟通风格标记为偏讲解型");
    }
    if (doc.evidenceLevel === "strong") score += 3;
    if (doc.evidenceLevel === "medium") score += 2;
    if (doc.evidenceLevel === "weak") score += 0.5;
    if (doc.evidenceLevel === "insufficient") score -= 1;

    // —— 真实意图门禁：角色硬过滤优先于分数 ——
    const intent = needs.trueIntent;
    if (intent?.excludeRoles?.includes(doc.serviceRole)) {
      score -= 20;
      reasons.push(`真实意图排除角色「${doc.serviceRole}」`);
    }
    if (intent?.preferRoles?.length) {
      if (intent.preferRoles.includes(doc.serviceRole)) {
        score += 10;
        reasons.push(`真实意图偏好角色「${doc.serviceRole}」`);
      }
    }

    // 院区科室编码：咨询意图只走 clinical_psychology / counseling_clinic
    if (
      intent &&
      (intent.modality === "psychological_counseling" ||
        intent.modality === "psychotherapy_cbt")
    ) {
      const okCodes = ["clinical_psychology", "counseling_clinic"];
      if (doc.departmentCode && !okCodes.includes(doc.departmentCode)) {
        score -= 12;
        reasons.push(
          `该院科室编码「${doc.departmentCode}」不符合咨询意图（各院科室结构不同）`
        );
      }
      if (doc.departmentCode && okCodes.includes(doc.departmentCode)) {
        score += 6;
        reasons.push(`命中该院咨询类科室编码「${doc.departmentCode}」`);
      }
    }

    // —— 关键：咨询诉求 ≠ 精神科开药 ——
    if (counseling) {
      const isCounselorRole =
        doc.serviceRole === "clinical_psychologist" ||
        doc.serviceRole === "counselor";
      const hasCounselTags =
        doc.capabilityTags.includes(CapabilityTag.PsychologicalCounseling) ||
        doc.capabilityTags.includes(CapabilityTag.Psychotherapy) ||
        doc.capabilityTags.includes(CapabilityTag.CBT);

      if (isCounselorRole && hasCounselTags) {
        score += 12;
        reasons.push("服务角色为心理咨询/临床心理，匹配会谈治疗诉求");
      }
      if (doc.capabilityTags.includes(CapabilityTag.CBT)) {
        score += 8;
        reasons.push("CBT/认知行为取向权重高于职称与名气");
      }
      if (doc.serviceRole === "psychiatrist" && !psychiatryMeds) {
        score -= 14;
        reasons.push("诉求偏心理咨询，纯精神科路径降权（避免错配）");
      }
      if (
        doc.capabilityTags.includes(CapabilityTag.PsychiatryMedication) &&
        !hasCounselTags &&
        !psychiatryMeds
      ) {
        score -= 6;
      }
    }

    if (psychiatryMeds && doc.serviceRole === "psychiatrist") {
      score += 6;
      reasons.push("诉求含精神科药物评估，精神科路径加分");
    }

    // —— 近期公开排班：可落地性加权（不承诺号源）——
    if (!doc.isPathCard) {
      const sched = scheduleBoostForDoctor(doc);
      if (sched.boost > 0) {
        // 时间紧时更看重近期出诊
        const mult = needs.constraints.timeTight ? 1.4 : 1;
        score += sched.boost * mult;
        if (sched.reason) reasons.push(sched.reason);
      } else if (needs.constraints.timeTight) {
        score -= 1;
      }
    }

    // 公开患者评价弱信号（沟通/首诊友好）
    const rs = doc.reviewSignals;
    if (rs && rs.sampleCount > 0) {
      if (rs.positiveAttitude >= 2 && rs.negativeAttitude === 0) {
        score += 1.5 * w.talk;
        reasons.push("公开患者评价对沟通/体验偏正面（弱信号）");
      } else if (rs.negativeAttitude > rs.positiveAttitude) {
        score -= 1;
      }
    }

    if (doc.isPathCard) {
      if (needs.diseaseArea === "general" && doc.serviceRole === "path") {
        score += 8;
        reasons.push("方向未清时，路径澄清优先于点名专家");
      } else if (
        counseling &&
        (doc.serviceRole === "counselor" ||
          doc.serviceRole === "clinical_psychologist")
      ) {
        // 有具名咨询医师时，路径卡大幅降权
        score -= 4;
        reasons.push("院区路径卡仅作备选（已有具名库时降权）");
      } else if (doc.serviceRole === "path") {
        score -= 6;
      }
    } else if (
      counseling &&
      (doc.serviceRole === "clinical_psychologist" || doc.serviceRole === "counselor")
    ) {
      score += 4;
      reasons.push("具名临床心理/咨询医师，优先于路径卡");
    }

    const matchLevel: MatchLevel = (() => {
      // 路径卡不是具名医生，避免「高匹配」造成假精确
      if (doc.isPathCard) {
        if (score >= 22) return "中";
        if (score >= 10) return "中";
        return "低";
      }
      return score >= 18 ? "高" : score >= 10 ? "中" : "低";
    })();
    return {
      ...doc,
      score,
      matchLevel,
      matchReasons: [...new Set(reasons)]
        .map((r) =>
          r
            .replace(/命中能力标签\s+/g, "能力方向匹配：")
            .replace(/psychological_counseling/g, CAPABILITY_LABELS.psychological_counseling)
            .replace(/\bpsychotherapy\b/g, CAPABILITY_LABELS.psychotherapy)
            .replace(/\bCBT\b/g, CAPABILITY_LABELS.CBT)
            .replace(/depression_management/g, CAPABILITY_LABELS.depression_management)
            .replace(/clear_communication/g, CAPABILITY_LABELS.clear_communication)
            .replace(/chronic_management/g, CAPABILITY_LABELS.chronic_management)
            .replace(/clinical_psychology/g, "临床心理类科室")
            .replace(/counseling_clinic/g, "心理咨询类门诊")
            .replace(/psychiatrist/g, "精神科医师")
            .replace(/clinical_psychologist/g, "临床心理")
            .replace(/counselor/g, "心理咨询")
        )
        .slice(0, 5),
    } satisfies MatchedDoctor;
  });

  scored.sort((a, b) => b.score - a.score);
  const top = pickTopWithCampusDiversity(scored, 3, preferredCampus);

  // 若咨询诉求下 Top 全是路径卡，而库里有具名咨询医师，强制替换
  if (counseling) {
    const namedCounsel = scored.filter(
      (d) =>
        !d.isPathCard &&
        (d.serviceRole === "counselor" ||
          d.serviceRole === "clinical_psychologist" ||
          d.capabilityTags.includes(CapabilityTag.PsychologicalCounseling))
    );
    const topAllPath = top.every((d) => d.isPathCard);
    if (topAllPath && namedCounsel.length > 0) {
      const diversified = pickTopWithCampusDiversity(
        namedCounsel,
        3,
        preferredCampus
      );
      return {
        matched: diversified,
        trace: scored.slice(0, 8).map((d) => ({
          doctorId: d.id,
          score: d.score,
          reasons: d.matchReasons,
        })),
      };
    }
  }

  if (counseling) {
    const counselPool = scored.filter(
      (d) =>
        d.serviceRole === "counselor" ||
        d.serviceRole === "clinical_psychologist" ||
        d.capabilityTags.includes(CapabilityTag.PsychologicalCounseling)
    );
    const hasCounselInTop = top.some(
      (d) =>
        d.serviceRole === "counselor" ||
        d.serviceRole === "clinical_psychologist"
    );
    if (!hasCounselInTop && counselPool.length > 0) {
      const diversified = pickTopWithCampusDiversity(
        counselPool,
        3,
        preferredCampus
      );
      return {
        matched: diversified,
        trace: scored.slice(0, 8).map((d) => ({
          doctorId: d.id,
          score: d.score,
          reasons: d.matchReasons,
        })),
      };
    }
  }

  return {
    matched: top,
    trace: scored.slice(0, 8).map((d) => ({
      doctorId: d.id,
      score: d.score,
      reasons: d.matchReasons,
    })),
  };
}
