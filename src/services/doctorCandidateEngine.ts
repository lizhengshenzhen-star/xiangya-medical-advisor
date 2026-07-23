import type { CapabilityTag, DoctorProfile, HospitalCampus } from "../models/types";
import { decideHospital } from "./hospitalDecisionEngine";
import type { DiseaseScenario } from "./diseaseScenarioClassifier";
import type { VisitGoal, UrgencyLevel } from "./intentExtractor";
import {
  inferDoctorGender,
  type PreferredGender,
} from "./doctorGender";

export type BookingHint = "普通" | "专家" | "专病门诊" | "急诊";
export type UrgencyLabel = "急诊" | "72小时内" | "1周内" | "可预约";

export interface DoctorDirectionCandidate {
  id: string;
  hospital: string;
  hospitalCampus: HospitalCampus;
  department: string;
  doctorType: string;
  score: number;
  reasons: string[];
  whyNotAlternative: string;
  bookingHint: BookingHint;
  urgencyLabel: UrgencyLabel;
  suitedFor: string;
  namedDoctors: Array<{
    id: string;
    name: string;
    title: string;
    department: string;
    gender?: PreferredGender | "unknown";
  }>;
  isEmergency?: boolean;
}

export interface GenerateCandidatesInput {
  city: string;
  scenario: DiseaseScenario;
  goal: VisitGoal;
  urgency: UrgencyLevel;
  chiefComplaint?: string;
  dualPaths?: string[];
  preferredGender?: PreferredGender;
  /** 追问后的排序偏置 */
  rankingBias?: {
    preferSurgery?: boolean;
    preferCounseling?: boolean;
    preferCardiologyCheck?: boolean;
    confirmedFirstVisit?: boolean;
  };
  doctors?: DoctorProfile[];
}

function urgencyLabel(u: UrgencyLevel, emergency: boolean): UrgencyLabel {
  if (emergency || u === "high") return "急诊";
  if (u === "medium") return "72小时内";
  return "可预约";
}

function titleRank(title: string): number {
  if (title.includes("一级主任") || title.includes("教授")) return 4;
  if (title.includes("主任")) return 3;
  if (title.includes("副主")) return 2;
  return 1;
}

function pickNamed(
  doctors: DoctorProfile[] | undefined,
  campus: HospitalCampus,
  codes: string[],
  limit = 3,
  opts?: {
    preferredGender?: PreferredGender;
    preferTags?: CapabilityTag[];
  },
) {
  if (!doctors?.length) return [];
  const preferTags = opts?.preferTags || [];
  const preferredGender = opts?.preferredGender;

  const scored = doctors
    .filter(
      (d) =>
        !d.isPathCard &&
        d.hospitalCampus === campus &&
        (codes.length === 0 || codes.includes(d.departmentCode)),
    )
    .map((d) => {
      const gender = inferDoctorGender(d);
      let score = titleRank(d.title) * 10;
      for (const tag of preferTags) {
        if (d.capabilityTags.includes(tag)) score += 8;
      }
      if (preferredGender) {
        if (gender === preferredGender) score += 100;
        else if (gender === "unknown") score += 10;
        else score -= 40;
      }
      // 心理治疗路径优先咨询专科 / 非纯开药角色
      if (
        d.departmentCode === "counseling_clinic" ||
        d.serviceRole === "clinical_psychologist" ||
        d.serviceRole === "counselor"
      ) {
        score += 12;
      }
      return { d, gender, score };
    })
    .sort((a, b) => b.score - a.score);

  // 有明确性别偏好时：尽量保证前排是匹配性别；不足再回填
  const matched = preferredGender
    ? scored.filter((x) => x.gender === preferredGender)
    : scored;
  const fallback = preferredGender
    ? scored.filter((x) => x.gender !== preferredGender)
    : [];
  const ordered = [...matched, ...fallback].slice(0, limit);

  return ordered.map(({ d, gender }) => ({
    id: d.id,
    name: d.name,
    title: d.title,
    department: d.department,
    gender,
  }));
}

/**
 * 按城市 + 疾病场景 + 就诊目标生成医生/专科方向候选池。
 * 先方向卡，再挂具名医生（若库中有）。
 */
export function generateCandidates(
  input: GenerateCandidatesInput
): DoctorDirectionCandidate[] {
  const hospital = decideHospital({
    city: input.city || "长沙",
    scenario: input.scenario,
    symptoms: [input.chiefComplaint || ""],
  });

  const bias = input.rankingBias || {};
  const emergency = hospital.urgency === "emergency" || input.urgency === "high";

  if (emergency && input.scenario === "急危重症") {
    return [
      {
        id: "em_neuro",
        hospital: hospital.primaryHospital,
        hospitalCampus: hospital.primaryCampus,
        department: "急诊科 → 神经内科/卒中通道",
        doctorType: "急诊神经评估（非普通门诊）",
        score: 98,
        reasons: [
          "突发神经功能缺损属于高危信号，应走急诊而非预约专家号",
          "优先就近可及的急诊通道，缩短延误",
        ],
        whyNotAlternative: "此场景不进入普通医生推荐流程，也不应在两院之间等待门诊号。",
        bookingHint: "急诊",
        urgencyLabel: "急诊",
        suitedFor: "突发说话含糊、肢体无力、严重头晕等疑似卒中表现",
        namedDoctors: [],
        isEmergency: true,
      },
      {
        id: "em_alt",
        hospital:
          hospital.alternativeHospital || "中南大学湘雅医院",
        hospitalCampus: hospital.alternativeCampus || "xiangya",
        department: "急诊科",
        doctorType: "就近急诊（可达性优先）",
        score: 90,
        reasons: ["若该院更快到达，应优先就近急诊"],
        whyNotAlternative: "院区名气次于送达时间。",
        bookingHint: "急诊",
        urgencyLabel: "急诊",
        suitedFor: "同样具备急症处理能力时的就近备选",
        namedDoctors: [],
        isEmergency: true,
      },
    ];
  }

  const out: DoctorDirectionCandidate[] = [];

  if (input.scenario === "精神心理") {
    const primaryCampus = hospital.primaryCampus;
    const preferCounsel = bias.preferCounseling !== false;
    const genderHint = input.preferredGender
      ? input.preferredGender === "female"
        ? "已按你的要求优先匹配女医生"
        : "已按你的要求优先匹配男医生"
      : null;
    const psychTags = (
      preferCounsel
        ? ["CBT", "psychotherapy", "depression_management", "psychological_counseling"]
        : ["depression_management", "mental_health"]
    ) as CapabilityTag[];

    out.push({
      id: "psy_xy2",
      hospital: "中南大学湘雅二医院",
      hospitalCampus: "xiangya2",
      department: "精神卫生中心 / 精神卫生科",
      doctorType: preferCounsel
        ? "焦虑抑郁相关专病 / 心理治疗门诊"
        : "精神卫生评估门诊",
      score: 95 + (primaryCampus === "xiangya2" ? 2 : 0) + (input.preferredGender ? 1 : 0),
      reasons: [
        "湘雅体系内精神专科资源更集中，适合失眠、焦虑、惊恐等首次方向",
        "可同时评估是否需要会谈治疗或药物路径",
        ...(genderHint ? [genderHint] : []),
      ],
      whyNotAlternative:
        "湘雅本部综合强，但核心精神心理首次就诊通常更匹配附二专科路径。",
      bookingHint: "专病门诊",
      urgencyLabel: urgencyLabel(input.urgency, false),
      suitedFor: "失眠、焦虑、惊恐、长期情绪问题",
      namedDoctors: pickNamed(
        input.doctors,
        "xiangya2",
        ["psychiatry", "counseling_clinic", "clinical_psychology"],
        5,
        {
          preferredGender: input.preferredGender,
          preferTags: psychTags,
        },
      ),
    });

    if (input.dualPaths?.includes("心律失常排查") || bias.preferCardiologyCheck) {
      out.push({
        id: "card_check",
        hospital: "中南大学湘雅二医院",
        hospitalCampus: "xiangya2",
        department: "心血管内科",
        doctorType: "心律失常 / 心悸相关门诊",
        score: bias.preferCardiologyCheck ? 93 : 82,
        reasons: [
          "心慌若伴胸痛、晕厥或明显气短，需先排查心脏急症可能",
        ],
        whyNotAlternative: "若心慌仅为焦虑伴随且无危险信号，优先精神心理路径。",
        bookingHint: "专家",
        urgencyLabel: urgencyLabel(input.urgency, false),
        suitedFor: "心慌发作时伴胸痛、晕厥或明显气短",
        namedDoctors: pickNamed(input.doctors, "xiangya2", ["cardiology"], 2),
      });
    }

    out.push({
      id: "psy_xy",
      hospital: "中南大学湘雅医院",
      hospitalCampus: "xiangya",
      department: "临床心理科 / 精神卫生科",
      doctorType: "综合心理门诊",
      score: 82,
      reasons: ["综合平台强，适合躯体病合并心理问题或已在本院就诊者"],
      whyNotAlternative: "纯精神心理首诊通常附二更贴。",
      bookingHint: "普通",
      urgencyLabel: urgencyLabel(input.urgency, false),
      suitedFor: "综合躯体疾病合并心理问题",
      namedDoctors: pickNamed(
        input.doctors,
        "xiangya",
        ["clinical_psychology", "psychiatry"],
        2,
        { preferredGender: input.preferredGender, preferTags: psychTags },
      ),
    });
  } else if (input.scenario === "呼吸与胸部") {
    const surgery = input.goal === "surgery" || bias.preferSurgery;
    out.push({
      id: surgery ? "thoracic_xy" : "resp_xy",
      hospital: "中南大学湘雅医院",
      hospitalCampus: "xiangya",
      department: surgery ? "胸外科" : "呼吸与危重症医学科",
      doctorType: surgery ? "手术评估 / 微创相关门诊" : "肺结节评估门诊",
      score: surgery ? 96 : 92,
      reasons: surgery
        ? [
            "诉求明确含手术评估，优先胸外科能力方向",
            "湘雅本部胸部相关平台适合系统评估适应证",
          ]
        : [
            "肺结节宜先规范评估，再决定是否手术",
            "呼吸专科适合首诊分流与随访策略",
          ],
      whyNotAlternative: surgery
        ? "先手术评估时，胸外优先于仅做随访的普通号。"
        : "若已明确倾向手术决策，可并行胸外科。",
      bookingHint: surgery ? "专家" : "专病门诊",
      urgencyLabel: urgencyLabel(input.urgency, false),
      suitedFor: surgery ? "肺结节手术评估" : "肺结节随访与良恶性评估",
      namedDoctors: pickNamed(
        input.doctors,
        "xiangya",
        surgery ? ["thoracic"] : ["respiratory", "thoracic"]
      ),
    });
    out.push({
      id: surgery ? "resp_alt" : "thoracic_alt",
      hospital: "中南大学湘雅医院",
      hospitalCampus: "xiangya",
      department: surgery ? "呼吸与危重症医学科" : "胸外科",
      doctorType: surgery ? "术前内科评估备选" : "手术评估备选",
      score: 84,
      reasons: ["可作为并行核验路径"],
      whyNotAlternative: "主路径已覆盖核心诉求。",
      bookingHint: "普通",
      urgencyLabel: urgencyLabel(input.urgency, false),
      suitedFor: "需要第二意见时",
      namedDoctors: pickNamed(
        input.doctors,
        "xiangya",
        surgery ? ["respiratory"] : ["thoracic"],
        2
      ),
    });
  } else if (input.scenario === "神经外科疑难") {
    out.push({
      id: "ns_xy",
      hospital: "中南大学湘雅医院",
      hospitalCampus: "xiangya",
      department: "神经外科",
      doctorType: "疑难神经外科评估",
      score: 96,
      reasons: hospital.reasons.slice(0, 2),
      whyNotAlternative: hospital.whyNotAlternative,
      bookingHint: "专家",
      urgencyLabel: urgencyLabel(input.urgency, false),
      suitedFor: "脑肿瘤、动脉瘤等疑难评估",
      namedDoctors: pickNamed(input.doctors, "xiangya", [], 3).filter((d) =>
        /神经外/.test(d.department)
      ),
    });
  } else {
    out.push({
      id: "gen_primary",
      hospital: hospital.primaryHospital,
      hospitalCampus: hospital.primaryCampus,
      department: hospital.suggestedDepartments[0] || "全科 / 对口专科",
      doctorType: "综合首诊分流",
      score: 85,
      reasons: hospital.reasons.slice(0, 2),
      whyNotAlternative: hospital.whyNotAlternative,
      bookingHint: "普通",
      urgencyLabel: urgencyLabel(input.urgency, false),
      suitedFor: input.chiefComplaint || "症状未分清时的首诊",
      namedDoctors: pickNamed(input.doctors, hospital.primaryCampus, [], 2),
    });
  }

  return out
    .map((c) => ({ ...c, score: Math.min(99, c.score) }))
    .sort((a, b) => b.score - a.score);
}

export function formatRecommendationCard(
  primary: DoctorDirectionCandidate,
  alternative?: DoctorDirectionCandidate
): string {
  const lines = [
    "## 推荐结果",
    "",
    "### 优先医生方向",
    `医院：${primary.hospital}`,
    `科室：${primary.department}`,
    `医生类型：${primary.doctorType}`,
  ];
  if (primary.namedDoctors.length) {
    lines.push(
      `可参考医生：${primary.namedDoctors.map((d) => `${d.name}（${d.title}）`).join("、")}`
    );
  }
  lines.push(
    "",
    "### 为什么推荐",
    ...primary.reasons.map((r) => `- ${r}`),
    "",
    "### 为什么不是另一个常见选择",
    primary.whyNotAlternative,
    "",
    "### 建议挂号时段",
    primary.bookingHint,
    "",
    "### 紧急程度",
    primary.urgencyLabel
  );
  if (alternative) {
    lines.push(
      "",
      "### 备选",
      `${alternative.hospital} · ${alternative.department}（${alternative.doctorType}）`
    );
  }
  return lines.join("\n");
}
