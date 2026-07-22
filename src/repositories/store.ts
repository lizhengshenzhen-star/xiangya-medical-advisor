/** 存储适配接口：本地 → 可换 Supabase / 飞书多维表 */
export interface DataStore {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
}

export class LocalStorageStore implements DataStore {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  async setItem<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

/** 预留：Supabase / 飞书适配器（当前不强制依赖） */
export class FutureRemoteStore implements DataStore {
  private provider: "supabase" | "feishu";
  constructor(provider: "supabase" | "feishu") {
    this.provider = provider;
  }
  async getItem<T>(_key: string): Promise<T | null> {
    console.info(`[${this.provider}] remote store not wired yet`);
    return null;
  }
  async setItem<T>(_key: string, _value: T): Promise<void> {
    console.info(`[${this.provider}] remote store not wired yet`);
  }
}
