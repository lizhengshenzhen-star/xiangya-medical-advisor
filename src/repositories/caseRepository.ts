import type { AiMisjudgmentReason, CaseRecord } from "../models/types";
import type { DataStore } from "./store";

const KEY = "yice_cases_v2";

export class CaseRepository {
  private store: DataStore;
  constructor(store: DataStore) {
    this.store = store;
  }

  async list(): Promise<CaseRecord[]> {
    return (await this.store.getItem<CaseRecord[]>(KEY)) ?? [];
  }

  async get(id: string): Promise<CaseRecord | undefined> {
    return (await this.list()).find((c) => c.id === id);
  }

  async save(record: CaseRecord): Promise<void> {
    const all = await this.list();
    const idx = all.findIndex((c) => c.id === record.id);
    if (idx >= 0) all[idx] = { ...record, updatedAt: new Date().toISOString() };
    else all.unshift(record);
    await this.store.setItem(KEY, all.slice(0, 100));
  }

  async updateFeedback(
    id: string,
    patch: Partial<
      Pick<
        CaseRecord,
        | "companionCorrection"
        | "finalDoctor"
        | "doctorActualAdvice"
        | "patientFinalChoice"
        | "estimatedCost"
        | "satisfactionScore"
        | "reducedTravelFlag"
        | "followUp30d"
        | "aiMisjudgmentReasons"
        | "aiMisjudgmentNote"
      >
    >
  ): Promise<CaseRecord | undefined> {
    const all = await this.list();
    const idx = all.findIndex((c) => c.id === id);
    if (idx < 0) return undefined;
    all[idx] = {
      ...all[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this.store.setItem(KEY, all);
    return all[idx];
  }

  async remove(id: string): Promise<void> {
    const all = (await this.list()).filter((c) => c.id !== id);
    await this.store.setItem(KEY, all);
  }
}

export const MISJUDGMENT_OPTIONS: { id: AiMisjudgmentReason; label: string }[] = [
  { id: "wrong_stage", label: "阶段判断错误" },
  { id: "wrong_department", label: "科室/方向偏差" },
  { id: "overweight_title", label: "过度依赖职称/名气" },
  { id: "ignored_constraint", label: "忽略现实约束" },
  { id: "weak_evidence_overused", label: "弱证据被过度使用" },
  { id: "missed_psychotherapy_need", label: "忽略心理治疗取向诉求" },
  { id: "other", label: "其他" },
];
