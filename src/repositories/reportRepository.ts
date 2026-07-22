import type { AiDecision, CaseRecord } from "../models/types";
import { toShareableMarkdown } from "../engines/explanationEngine";
import type { DataStore } from "./store";

const KEY = "yice_reports_v2";

export interface StoredReport {
  id: string;
  caseId: string;
  createdAt: string;
  markdown: string;
  decisionSnapshot: AiDecision;
}

export class ReportRepository {
  private store: DataStore;
  constructor(store: DataStore) {
    this.store = store;
  }

  async list(): Promise<StoredReport[]> {
    return (await this.store.getItem<StoredReport[]>(KEY)) ?? [];
  }

  async saveFromCase(caseRecord: CaseRecord): Promise<StoredReport> {
    const report: StoredReport = {
      id: `rpt_${caseRecord.id}`,
      caseId: caseRecord.id,
      createdAt: new Date().toISOString(),
      markdown: toShareableMarkdown(caseRecord.aiDecision),
      decisionSnapshot: caseRecord.aiDecision,
    };
    const all = await this.list();
    const idx = all.findIndex((r) => r.id === report.id);
    if (idx >= 0) all[idx] = report;
    else all.unshift(report);
    await this.store.setItem(KEY, all.slice(0, 100));
    return report;
  }

  async getByCaseId(caseId: string): Promise<StoredReport | undefined> {
    return (await this.list()).find((r) => r.caseId === caseId);
  }
}
