import type { DoctorProfile } from "../../models/types";
import { CapabilityTag } from "../../models/types";
import type { FastRecommendResult } from "../../services/fastRecommendPipeline";
import {
  genderLabel,
  inferDoctorGender,
} from "../../services/doctorGender";
import { computeMatchScore, matchLevelFromScore } from "./matchScore";
import {
  TherapyCapabilityTag,
  type DoctorDecisionCandidate,
  type DoctorDecisionResult,
  type DoctorRoleSlot,
  type TherapyCapabilityTag as TherapyTag,
} from "./types";

const ROLE_SLOTS: DoctorRoleSlot[] = ["primary", "alternative", "styleAlternative"];

function mapCapabilityTags(doctor: DoctorProfile, raw: string): TherapyTag[] {
  const tags: TherapyTag[] = [];
  const push = (t: TherapyTag) => {
    if (!tags.includes(t) && tags.length < 4) tags.push(t);
  };

  if (
    doctor.capabilityTags.includes(CapabilityTag.CBT) ||
    /CBT|认知行为/.test(raw) ||
    /CBT|认知行为/.test(doctor.specialty || "") ||
    /CBT|认知行为/.test(doctor.evidence || "")
  ) {
    push(TherapyCapabilityTag.CBT);
  }
  if (
    doctor.capabilityTags.includes(CapabilityTag.DepressionManagement) ||
    /抑郁/.test(raw)
  ) {
    push(TherapyCapabilityTag.Depression);
  }
  if (/焦虑/.test(raw) || /焦虑/.test(doctor.specialty || "")) {
    push(TherapyCapabilityTag.Anxiety);
  }
  if (
    doctor.capabilityTags.includes(CapabilityTag.Psychotherapy) ||
    doctor.capabilityTags.includes(CapabilityTag.PsychologicalCounseling)
  ) {
    push(TherapyCapabilityTag.Psychotherapy);
  }
  if (/长期|会谈|咨询/.test(raw) || doctor.serviceRole.includes("psych")) {
    push(TherapyCapabilityTag.LongTermTalk);
  }
  if (doctor.firstVisitFriendly) push(TherapyCapabilityTag.FirstVisitFriendly);
  if (doctor.capabilityTags.includes(CapabilityTag.PsychiatryMedication)) {
    push(TherapyCapabilityTag.MedicationEval);
  }
  if (tags.length === 0) push(TherapyCapabilityTag.Psychotherapy);
  return tags;
}

function buildPersonalizedReason(
  doctor: DoctorProfile,
  result: FastRecommendResult,
): string {
  const need = result.intent.chiefComplaint || "心理咨询";
  const genderAsk = result.intent.preferredGender
    ? `，且希望${genderLabel(result.intent.preferredGender)}医生`
    : "";
  const genderHit =
    result.intent.preferredGender &&
    inferDoctorGender(doctor) === result.intent.preferredGender
      ? `该医生公开画像符合你的性别偏好，`
      : "";
  return `你的需求是「${need}${genderAsk}」，${genderHit}其在${doctor.department}方向具备会谈/评估相关公开能力证据，匹配点在于路径能力与你的就诊目标一致。`.slice(
    0,
    80,
  );
}

function genderRank(
  doctor: DoctorProfile,
  preferred: FastRecommendResult["intent"]["preferredGender"],
): number {
  if (!preferred) return 0;
  const g = inferDoctorGender(doctor);
  if (g === preferred) return 2;
  if (g === "unknown") return 1;
  return 0;
}

function toCandidate(
  doctor: DoctorProfile,
  role: DoctorRoleSlot,
  result: FastRecommendResult,
  baseScore: number,
): DoctorDecisionCandidate {
  const preferred = result.intent.preferredGender;
  const gender = inferDoctorGender(doctor);
  const genderBonus =
    preferred == null ? 0 : gender === preferred ? 10 : gender === "unknown" ? 0 : -18;

  const breakdown = {
    therapyOrientation:
      doctor.capabilityTags.includes(CapabilityTag.CBT) ||
      /认知行为|CBT/.test(result.intent.raw)
        ? 90 + Math.max(genderBonus, 0)
        : 78 + Math.max(genderBonus, 0),
    diseaseMatch: doctor.capabilityTags.includes(CapabilityTag.DepressionManagement)
      ? 88
      : 76,
    talkEvidence:
      doctor.capabilityTags.includes(CapabilityTag.Psychotherapy) ||
      doctor.capabilityTags.includes(CapabilityTag.PsychologicalCounseling)
        ? 86
        : 72,
    firstVisitFriendly: doctor.firstVisitFriendly ? 88 : 70,
    bookingConvenience: preferred && gender === preferred ? 90 : 78,
  };

  const matchScore = Math.min(
    99,
    Math.max(
      55,
      computeMatchScore(breakdown) +
        Math.round((baseScore - 90) / 2) +
        (preferred && gender === preferred ? 4 : preferred && gender !== "unknown" ? -6 : 0),
    ),
  );

  const titleHead = doctor.title.split(/[／/]/)[0] || doctor.title;
  const academic =
    /教授|博导|博士生导师/.test(doctor.title)
      ? doctor.title.replace(titleHead, "").replace(/^[／/\s]+/, "") || "临床教授方向"
      : doctor.serviceRole === "clinical_psychologist"
        ? "临床心理方向"
        : "专科医师";

  return {
    id: doctor.id,
    role,
    name: doctor.name,
    avatarInitials: doctor.name.slice(0, 1),
    hospital: doctor.hospital,
    department: doctor.department,
    title: titleHead,
    academicLevel: academic || doctor.title,
    matchScore,
    matchLevel: matchLevelFromScore(matchScore),
    scoreBreakdown: {
      therapyOrientation: Math.min(100, Math.max(0, breakdown.therapyOrientation)),
      diseaseMatch: breakdown.diseaseMatch,
      talkEvidence: breakdown.talkEvidence,
      firstVisitFriendly: breakdown.firstVisitFriendly,
      bookingConvenience: breakdown.bookingConvenience,
    },
    scoreExplain: preferred
      ? `性别偏好已计入排序：匹配${genderLabel(preferred)}医生会拉高总分；能力证据不足时不会只因性别成为主推荐。当前推断性别：${genderLabel(gender)}。`
      : "分数由治疗取向、疾病匹配、会谈证据、首诊友好与预约便利加权得到。",
    capabilityTags: mapCapabilityTags(doctor, result.intent.raw),
    personalizedReason: buildPersonalizedReason(doctor, result),
    suitableFor:
      role === "primary"
        ? [
            "与当前诉求路径一致",
            "可预约门诊评估",
            preferred ? `符合${genderLabel(preferred)}医生偏好` : "适合建立首诊关系",
          ]
        : role === "alternative"
          ? ["主推荐约不到号时的替代", "同方向能力接近"]
          : ["沟通风格可能更契合", "适合循序建立关系"],
    notIdealFor: ["需要紧急住院", "严重危机未评估", "仅想快速开药且拒绝会谈"],
    bookingType: result.candidates[0]?.bookingHint
      ? `${result.candidates[0].bookingHint}号 · ${doctor.department}`
      : doctor.department,
    onlineSupported: Boolean(doctor.haodfDoctorId),
    scheduleStatus: "号源以医院官方/好大夫实时为准",
    bookingUrl: doctor.haodfDoctorId
      ? `https://www.haodf.com/doctor/${doctor.haodfDoctorId}.html`
      : "https://www.haodf.com",
  };
}

/**
 * 将快速推荐结果映射为五层决策页数据；有具名医生时优先展示真实排序。
 */
export function mapFastResultToDecision(
  result: FastRecommendResult,
  doctors: DoctorProfile[],
): DoctorDecisionResult {
  const byId = new Map(doctors.map((d) => [d.id, d]));
  const preferred = result.intent.preferredGender;
  const primaryDir = result.candidates[0];
  const named = primaryDir?.namedDoctors || [];

  const resolved: DoctorProfile[] = [];
  const pushUnique = (d: DoctorProfile | undefined) => {
    if (!d || resolved.some((x) => x.id === d.id)) return;
    resolved.push(d);
  };

  for (const n of named) pushUnique(byId.get(n.id));

  if (resolved.length < 3 && primaryDir) {
    const extras = doctors
      .filter(
        (d) =>
          !d.isPathCard &&
          d.hospitalCampus === primaryDir.hospitalCampus &&
          (d.departmentCode === "counseling_clinic" ||
            d.departmentCode === "psychiatry" ||
            d.departmentCode === "clinical_psychology"),
      )
      .sort((a, b) => {
        const gDiff = genderRank(b, preferred) - genderRank(a, preferred);
        if (gDiff !== 0) return gDiff;
        const preferSet = new Set<string>([
          CapabilityTag.CBT,
          CapabilityTag.Psychotherapy,
          CapabilityTag.DepressionManagement,
          CapabilityTag.PsychologicalCounseling,
        ]);
        const tagScore = (d: DoctorProfile) =>
          d.capabilityTags.filter((t) => preferSet.has(t)).length;
        return tagScore(b) - tagScore(a);
      });
    for (const d of extras) {
      if (resolved.length >= 6) break;
      pushUnique(d);
    }
  }

  // 性别偏好：最终展示前强制按性别优先重排
  resolved.sort((a, b) => {
    const gDiff = genderRank(b, preferred) - genderRank(a, preferred);
    if (gDiff !== 0) return gDiff;
    return 0;
  });

  const top3 = resolved.slice(0, 3);
  const candidates: DoctorDecisionCandidate[] = top3.map((d, i) =>
    toCandidate(d, ROLE_SLOTS[i] || "styleAlternative", result, primaryDir?.score || 90 - i),
  );

  if (candidates.length === 0 && primaryDir) {
    candidates.push({
      id: primaryDir.id,
      role: "primary",
      name: primaryDir.doctorType,
      avatarInitials: "医",
      hospital: primaryDir.hospital,
      department: primaryDir.department,
      title: primaryDir.doctorType,
      academicLevel: "方向推荐",
      matchScore: primaryDir.score,
      matchLevel: matchLevelFromScore(primaryDir.score),
      scoreBreakdown: {
        therapyOrientation: 80,
        diseaseMatch: 80,
        talkEvidence: 75,
        firstVisitFriendly: 80,
        bookingConvenience: 70,
      },
      scoreExplain: "当前为专科方向卡，具名医生库待补全。",
      capabilityTags: [TherapyCapabilityTag.Psychotherapy],
      personalizedReason: `根据你的描述，优先匹配${primaryDir.hospital}·${primaryDir.department}方向。`,
      suitableFor: [primaryDir.suitedFor],
      notIdealFor: ["急危重症未评估"],
      bookingType: primaryDir.bookingHint,
      onlineSupported: false,
      scheduleStatus: primaryDir.urgencyLabel,
    });
  }

  const primaryName = candidates[0]?.name || "对口专科医生";
  const genderLine = preferred
    ? `已优先筛选${genderLabel(preferred)}医生`
    : "按能力匹配优先排序";

  const treatmentPreference =
    [
      /CBT|认知行为/.test(result.intent.raw) ? "认知行为治疗（CBT）" : null,
      preferred ? `${genderLabel(preferred)}医生` : null,
    ]
      .filter(Boolean)
      .join(" · ") ||
    primaryDir?.doctorType ||
    "对口专科评估";

  return {
    profile: {
      diseaseDirection: result.intent.diseaseScenario,
      coreNeed: result.intent.chiefComplaint || result.intent.diseaseScenario,
      treatmentPreference,
      visitGoal:
        result.intent.visitGoal === "follow_up"
          ? "长期会谈/随访"
          : result.intent.visitGoal === "first_visit"
            ? "首次建立治疗关系"
            : "明确评估路径",
      riskLevel: result.isEmergency
        ? "高危，优先急诊"
        : result.intent.urgency === "medium"
          ? "建议尽快门诊"
          : "非急诊，可预约",
      confidencePercent: Math.round(result.intent.scenarioConfidence * 100),
    },
    decisionSummary: [
      genderLine.slice(0, 28),
      `优先路径：${(primaryDir?.department || "对口专科").slice(0, 18)}`,
      `当前最推荐：${primaryName}`.slice(0, 28),
    ],
    candidates,
    moreDoctors: resolved.slice(3).map((d) => ({
      id: d.id,
      name: d.name,
      title: d.title,
      hospital: d.hospital,
    })),
    whyNot: [
      ...(candidates[1]
        ? [
            {
              label: candidates[1].name,
              betterFor:
                "更适合作为约不到主推荐时的替代，或沟通风格与你更合拍时再切换。",
            },
          ]
        : []),
      {
        label: "普通精神科快速门诊",
        betterFor: "更适合快速诊断与处方，不一定适合连续心理会谈。",
      },
    ].slice(0, 2),
    primaryDoctorName: primaryName,
  };
}
