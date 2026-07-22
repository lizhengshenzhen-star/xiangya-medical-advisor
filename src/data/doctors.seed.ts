/**
 * @deprecated 请维护 src/data/doctor-library/campuses/*.json
 * 本文件仅再导出文件库，保持旧 import 兼容。
 */
export { loadDoctorLibrary as getSeedDoctors, DOCTOR_LIBRARY_META } from "./doctor-library";
import { loadDoctorLibrary } from "./doctor-library";

/** 兼容旧名 */
export const SEED_DOCTORS = loadDoctorLibrary();
