import type {
  AnalyticsEvent,
  ConsultRecord,
  DoctorKnowledgeMeta,
  RecommendFeedback,
} from "../models/companion";
import type { DataStore } from "./store";

const CONSULT_KEY = "yice_consults_v1";
const EVENT_KEY = "yice_analytics_v1";
const OVERLAY_KEY = "yice_doctor_overlay_v1";

export class ConsultRepository {
  private store: DataStore;
  constructor(store: DataStore) {
    this.store = store;
  }

  async list(): Promise<ConsultRecord[]> {
    return (await this.store.getItem<ConsultRecord[]>(CONSULT_KEY)) ?? [];
  }

  async get(id: string): Promise<ConsultRecord | undefined> {
    return (await this.list()).find((c) => c.id === id);
  }

  async save(record: ConsultRecord): Promise<void> {
    const all = await this.list();
    const idx = all.findIndex((c) => c.id === record.id);
    const next = { ...record, updatedAt: new Date().toISOString() };
    if (idx >= 0) all[idx] = next;
    else all.unshift(next);
    await this.store.setItem(CONSULT_KEY, all.slice(0, 200));
  }

  async submitFeedback(
    id: string,
    feedback: RecommendFeedback,
  ): Promise<ConsultRecord | undefined> {
    const all = await this.list();
    const idx = all.findIndex((c) => c.id === id);
    if (idx < 0) return undefined;
    all[idx] = {
      ...all[idx],
      feedback,
      status: "feedback_done",
      updatedAt: new Date().toISOString(),
    };
    await this.store.setItem(CONSULT_KEY, all);
    return all[idx];
  }

  async remove(id: string): Promise<void> {
    await this.store.setItem(
      CONSULT_KEY,
      (await this.list()).filter((c) => c.id !== id),
    );
  }
}

export class AnalyticsRepository {
  private store: DataStore;
  constructor(store: DataStore) {
    this.store = store;
  }

  async list(): Promise<AnalyticsEvent[]> {
    return (await this.store.getItem<AnalyticsEvent[]>(EVENT_KEY)) ?? [];
  }

  async track(
    event: Omit<AnalyticsEvent, "id" | "createdAt"> & { id?: string },
  ): Promise<void> {
    const all = await this.list();
    all.unshift({
      id: event.id || `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: event.type,
      userId: event.userId,
      consultId: event.consultId,
      payload: event.payload,
      createdAt: new Date().toISOString(),
    });
    await this.store.setItem(EVENT_KEY, all.slice(0, 500));
  }
}

export class DoctorOverlayRepository {
  private store: DataStore;
  constructor(store: DataStore) {
    this.store = store;
  }

  async list(): Promise<DoctorKnowledgeMeta[]> {
    return (await this.store.getItem<DoctorKnowledgeMeta[]>(OVERLAY_KEY)) ?? [];
  }

  async get(doctorId: string): Promise<DoctorKnowledgeMeta | undefined> {
    return (await this.list()).find((x) => x.doctorId === doctorId);
  }

  async upsert(meta: DoctorKnowledgeMeta): Promise<void> {
    const all = await this.list();
    const idx = all.findIndex((x) => x.doctorId === meta.doctorId);
    if (idx >= 0) all[idx] = meta;
    else all.push(meta);
    await this.store.setItem(OVERLAY_KEY, all);
  }
}
