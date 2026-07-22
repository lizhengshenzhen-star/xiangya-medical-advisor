import type { DoctorProfile } from "../models/types";
import type { DataStore } from "./store";
import { DOCTOR_LIBRARY_META, loadDoctorLibrary } from "../data/doctor-library";

/** 升版本以强制从新文件库覆盖本地缓存 */
const KEY = "yice_doctors_v8_haodf_public";

export class DoctorRepository {
  private store: DataStore;
  constructor(store: DataStore) {
    this.store = store;
  }

  async listAll(): Promise<DoctorProfile[]> {
    const fromFiles = loadDoctorLibrary();
    const cached = await this.store.getItem<{
      version?: string;
      doctors: DoctorProfile[];
    }>(KEY);

    // 文件库版本更新时覆盖缓存
    if (!cached || cached.version !== DOCTOR_LIBRARY_META.version) {
      await this.store.setItem(KEY, {
        version: DOCTOR_LIBRARY_META.version,
        doctors: fromFiles,
      });
      return fromFiles;
    }
    return cached.doctors.length > 0 ? cached.doctors : fromFiles;
  }

  async getById(id: string): Promise<DoctorProfile | undefined> {
    return (await this.listAll()).find((d) => d.id === id);
  }

  async upsert(doctor: DoctorProfile): Promise<void> {
    const all = await this.listAll();
    const idx = all.findIndex((d) => d.id === doctor.id);
    if (idx >= 0) all[idx] = doctor;
    else all.push(doctor);
    await this.store.setItem(KEY, {
      version: DOCTOR_LIBRARY_META.version,
      doctors: all,
    });
  }

  async replaceAll(doctors: DoctorProfile[]): Promise<void> {
    await this.store.setItem(KEY, {
      version: DOCTOR_LIBRARY_META.version,
      doctors,
    });
  }

  /** 供工作台展示库规模 */
  getLibraryMeta() {
    return DOCTOR_LIBRARY_META;
  }
}
