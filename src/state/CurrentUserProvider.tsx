import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppUser } from "../models/companion";
import { useRepos } from "./RepoProvider";

interface UserCtx {
  user: AppUser | null;
  users: AppUser[];
  loading: boolean;
  refresh: () => Promise<void>;
  switchUser: (id: string) => Promise<void>;
}

const Ctx = createContext<UserCtx | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { users: userRepo } = useRepos();
  const [user, setUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await userRepo.list();
    const current = await userRepo.getCurrent();
    setUsers(list);
    setUser(current);
    setLoading(false);
  }, [userRepo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchUser = useCallback(
    async (id: string) => {
      const next = await userRepo.setCurrent(id);
      setUser(next);
      setUsers(await userRepo.list());
    },
    [userRepo],
  );

  const value = useMemo(
    () => ({ user, users, loading, refresh, switchUser }),
    [user, users, loading, refresh, switchUser],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrentUser() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCurrentUser must be used within CurrentUserProvider");
  return ctx;
}
