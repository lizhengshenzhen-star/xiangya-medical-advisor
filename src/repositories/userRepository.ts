import type { AppUser, AppUserRole } from "../models/companion";
import type { DataStore } from "./store";

const USERS_KEY = "yice_users_v1";
const CURRENT_KEY = "yice_current_user_v1";

const DEFAULT_USERS: AppUser[] = [
  {
    id: "u_companion_1",
    name: "演示陪诊师",
    role: "companion",
    createdAt: "2026-07-01T00:00:00.000Z",
    lastActiveAt: "2026-07-01T00:00:00.000Z",
    consultCount: 0,
  },
  {
    id: "u_advisor_1",
    name: "演示挂号顾问",
    role: "booking_advisor",
    createdAt: "2026-07-01T00:00:00.000Z",
    lastActiveAt: "2026-07-01T00:00:00.000Z",
    consultCount: 0,
  },
  {
    id: "u_admin_1",
    name: "演示管理员",
    role: "admin",
    createdAt: "2026-07-01T00:00:00.000Z",
    lastActiveAt: "2026-07-01T00:00:00.000Z",
    consultCount: 0,
  },
];

export class UserRepository {
  private store: DataStore;
  constructor(store: DataStore) {
    this.store = store;
  }

  async ensureSeed(): Promise<AppUser[]> {
    const existing = await this.store.getItem<AppUser[]>(USERS_KEY);
    if (existing?.length) return existing;
    await this.store.setItem(USERS_KEY, DEFAULT_USERS);
    return DEFAULT_USERS;
  }

  async list(): Promise<AppUser[]> {
    return this.ensureSeed();
  }

  async get(id: string): Promise<AppUser | undefined> {
    return (await this.list()).find((u) => u.id === id);
  }

  async getCurrent(): Promise<AppUser> {
    await this.ensureSeed();
    const id = await this.store.getItem<string>(CURRENT_KEY);
    const users = await this.list();
    const found = users.find((u) => u.id === id);
    if (found) return found;
    await this.store.setItem(CURRENT_KEY, users[0].id);
    return users[0];
  }

  async setCurrent(id: string): Promise<AppUser> {
    const user = await this.get(id);
    if (!user) throw new Error("user not found");
    const now = new Date().toISOString();
    await this.touch(id, { lastActiveAt: now });
    await this.store.setItem(CURRENT_KEY, id);
    return (await this.get(id))!;
  }

  async touch(
    id: string,
    patch: Partial<Pick<AppUser, "lastActiveAt" | "consultCount" | "name" | "role">>,
  ): Promise<void> {
    const all = await this.list();
    const idx = all.findIndex((u) => u.id === id);
    if (idx < 0) return;
    all[idx] = { ...all[idx], ...patch };
    await this.store.setItem(USERS_KEY, all);
  }

  async upsert(user: AppUser): Promise<void> {
    const all = await this.list();
    const idx = all.findIndex((u) => u.id === user.id);
    if (idx >= 0) all[idx] = user;
    else all.push(user);
    await this.store.setItem(USERS_KEY, all);
  }

  async create(name: string, role: AppUserRole): Promise<AppUser> {
    const now = new Date().toISOString();
    const user: AppUser = {
      id: `u_${Date.now()}`,
      name,
      role,
      createdAt: now,
      lastActiveAt: now,
      consultCount: 0,
    };
    await this.upsert(user);
    return user;
  }
}
