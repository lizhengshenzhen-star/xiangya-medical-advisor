import { createContext, useContext, useMemo, type ReactNode } from "react";
import { LocalStorageStore } from "../repositories/store";
import { DoctorRepository } from "../repositories/doctorRepository";
import { CaseRepository } from "../repositories/caseRepository";
import { ReportRepository } from "../repositories/reportRepository";
import {
  AnalyticsRepository,
  ConsultRepository,
  DoctorOverlayRepository,
} from "../repositories/consultRepository";
import { UserRepository } from "../repositories/userRepository";

interface Repos {
  doctors: DoctorRepository;
  cases: CaseRepository;
  reports: ReportRepository;
  consults: ConsultRepository;
  users: UserRepository;
  analytics: AnalyticsRepository;
  doctorOverlays: DoctorOverlayRepository;
}

const RepoContext = createContext<Repos | null>(null);

export function RepoProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => {
    const store = new LocalStorageStore();
    return {
      doctors: new DoctorRepository(store),
      cases: new CaseRepository(store),
      reports: new ReportRepository(store),
      consults: new ConsultRepository(store),
      users: new UserRepository(store),
      analytics: new AnalyticsRepository(store),
      doctorOverlays: new DoctorOverlayRepository(store),
    };
  }, []);
  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>;
}

export function useRepos() {
  const ctx = useContext(RepoContext);
  if (!ctx) throw new Error("useRepos must be used within RepoProvider");
  return ctx;
}
