import type { DoctorProfile } from "../../models/types";
import manifest from "./manifest.json";
import xiangya from "./campuses/xiangya.json";
import xiangya2 from "./campuses/xiangya2.json";

/** 医生信息文件库：仅湘雅 + 附二 */
const RAW_POOL = [...xiangya, ...xiangya2] as DoctorProfile[];

export const DOCTOR_LIBRARY_META = {
  version: manifest.version,
  updatedAt: manifest.updatedAt,
  disclaimer: manifest.disclaimer,
  count: RAW_POOL.length,
};

export function loadDoctorLibrary(): DoctorProfile[] {
  const map = new Map<string, DoctorProfile>();
  for (const d of RAW_POOL) {
    if (!d.id || !d.name || !d.hospitalCampus) {
      console.warn("[doctor-library] skip invalid record", d);
      continue;
    }
    if (d.hospitalCampus !== "xiangya" && d.hospitalCampus !== "xiangya2") {
      continue;
    }
    map.set(d.id, d);
  }
  return [...map.values()];
}

export function listDoctorsByCampus(campus: DoctorProfile["hospitalCampus"]) {
  return loadDoctorLibrary().filter((d) => d.hospitalCampus === campus);
}

export function listDoctorsByDepartmentCode(code: string) {
  return loadDoctorLibrary().filter((d) => d.departmentCode === code);
}

export function listCounselingDoctors() {
  return loadDoctorLibrary().filter(
    (d) =>
      d.serviceRole === "clinical_psychologist" ||
      d.serviceRole === "counselor" ||
      d.capabilityTags.includes("psychological_counseling") ||
      d.capabilityTags.includes("psychotherapy") ||
      d.capabilityTags.includes("CBT")
  );
}
