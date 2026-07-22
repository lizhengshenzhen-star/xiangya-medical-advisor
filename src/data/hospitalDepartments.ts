import {
  HospitalCampus,
  type HospitalCampus as Campus,
} from "../models/types";

/**
 * 院区科室结构：仅湘雅医院 + 湘雅二医院。
 * 两院科室名称/建制不同，禁止用同一套科室名硬套。
 * departmentCode 是跨院稳定编码；displayName 是该院对外挂号显示名。
 */
export const DepartmentCode = {
  Psychiatry: "psychiatry",
  ClinicalPsychology: "clinical_psychology",
  CounselingClinic: "counseling_clinic",
  Respiratory: "respiratory",
  Thoracic: "thoracic",
  Cardiology: "cardiology",
  Gastroenterology: "gastroenterology",
  Neurology: "neurology",
  Orthopedics: "orthopedics",
  Spine: "spine",
  GeneralPractice: "general_practice",
} as const;

export type DepartmentCode = (typeof DepartmentCode)[keyof typeof DepartmentCode];

export interface CampusDepartment {
  code: DepartmentCode;
  /** 该院挂号/官网常用显示名 */
  displayName: string;
  /** 该院是否明确区分咨询与精神科 */
  notes?: string;
  /** 服务形态 */
  careKinds: Array<
    "psychological_counseling" | "psychotherapy_cbt" | "psychiatry_medication" | "somatic"
  >;
}

export const HOSPITAL_DEPARTMENTS: Record<Campus, CampusDepartment[]> = {
  [HospitalCampus.Xiangya]: [
    {
      code: DepartmentCode.Psychiatry,
      displayName: "精神卫生科",
      careKinds: ["psychiatry_medication"],
      notes: "精神科路径；不等于心理咨询门诊",
    },
    {
      code: DepartmentCode.ClinicalPsychology,
      displayName: "临床心理科",
      careKinds: ["psychological_counseling", "psychotherapy_cbt"],
      notes: "会谈/评估为主，院内名称可能随门诊调整",
    },
    {
      code: DepartmentCode.CounselingClinic,
      displayName: "心理咨询相关门诊",
      careKinds: ["psychological_counseling", "psychotherapy_cbt"],
    },
    { code: DepartmentCode.Respiratory, displayName: "呼吸与危重症医学科", careKinds: ["somatic"] },
    { code: DepartmentCode.Thoracic, displayName: "胸外科", careKinds: ["somatic"] },
    { code: DepartmentCode.Cardiology, displayName: "心血管内科", careKinds: ["somatic"] },
    { code: DepartmentCode.Gastroenterology, displayName: "消化内科", careKinds: ["somatic"] },
    { code: DepartmentCode.Neurology, displayName: "神经内科", careKinds: ["somatic"] },
    { code: DepartmentCode.Orthopedics, displayName: "骨科", careKinds: ["somatic"] },
    { code: DepartmentCode.Spine, displayName: "脊柱外科", careKinds: ["somatic"] },
    { code: DepartmentCode.GeneralPractice, displayName: "全科医学科", careKinds: ["somatic"] },
  ],
  [HospitalCampus.Xiangya2]: [
    {
      code: DepartmentCode.Psychiatry,
      displayName: "精神卫生科",
      careKinds: ["psychiatry_medication"],
      notes: "附二精神卫生实力突出；仍不等于「只要咨询」",
    },
    {
      code: DepartmentCode.ClinicalPsychology,
      displayName: "临床心理科",
      careKinds: ["psychological_counseling", "psychotherapy_cbt"],
      notes: "附二临床心理/心理治疗资源需按门诊项目确认",
    },
    {
      code: DepartmentCode.CounselingClinic,
      displayName: "心理治疗/咨询门诊",
      careKinds: ["psychological_counseling", "psychotherapy_cbt"],
    },
    { code: DepartmentCode.GeneralPractice, displayName: "全科医学科", careKinds: ["somatic"] },
  ],
};

export function departmentsForModality(
  campus: Campus,
  modality: string
): CampusDepartment[] {
  const all = HOSPITAL_DEPARTMENTS[campus];
  if (
    modality === "psychological_counseling" ||
    modality === "psychotherapy_cbt"
  ) {
    return all.filter((d) =>
      d.careKinds.some(
        (k) => k === "psychological_counseling" || k === "psychotherapy_cbt"
      )
    );
  }
  if (modality === "psychiatry_medication") {
    return all.filter((d) => d.careKinds.includes("psychiatry_medication"));
  }
  if (modality === "combined") {
    return all.filter((d) =>
      d.careKinds.some(
        (k) =>
          k === "psychological_counseling" ||
          k === "psychotherapy_cbt" ||
          k === "psychiatry_medication"
      )
    );
  }
  return all;
}

export function displayNameFor(
  campus: Campus,
  code: DepartmentCode
): string | undefined {
  return HOSPITAL_DEPARTMENTS[campus].find((d) => d.code === code)?.displayName;
}
