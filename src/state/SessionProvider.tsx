import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AiDecision, StructuredNeeds } from "../models/types";
import type { FastRecommendResult } from "../services/fastRecommendPipeline";
import type { MinimalFollowUpQuestion } from "../services/minimalFollowUp";

interface SessionState {
  narrative: string;
  setNarrative: (v: string) => void;
  fastResult: FastRecommendResult | null;
  setFastResult: (v: FastRecommendResult | null) => void;
  pendingFollowUps: MinimalFollowUpQuestion[];
  setPendingFollowUps: (v: MinimalFollowUpQuestion[]) => void;
  rankingBias: Record<string, boolean>;
  setRankingBias: (v: Record<string, boolean>) => void;
  /** 兼容旧报告流 */
  decision: AiDecision | null;
  setDecision: (v: AiDecision | null) => void;
  structuredNeeds: StructuredNeeds | null;
  setStructuredNeeds: (v: StructuredNeeds | null) => void;
  activeCaseId: string | null;
  setActiveCaseId: (v: string | null) => void;
  resetSession: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [narrative, setNarrative] = useState("");
  const [fastResult, setFastResult] = useState<FastRecommendResult | null>(null);
  const [pendingFollowUps, setPendingFollowUps] = useState<
    MinimalFollowUpQuestion[]
  >([]);
  const [rankingBias, setRankingBias] = useState<Record<string, boolean>>({});
  const [decision, setDecision] = useState<AiDecision | null>(null);
  const [structuredNeeds, setStructuredNeeds] = useState<StructuredNeeds | null>(
    null
  );
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      narrative,
      setNarrative,
      fastResult,
      setFastResult,
      pendingFollowUps,
      setPendingFollowUps,
      rankingBias,
      setRankingBias,
      decision,
      setDecision,
      structuredNeeds,
      setStructuredNeeds,
      activeCaseId,
      setActiveCaseId,
      resetSession: () => {
        setNarrative("");
        setFastResult(null);
        setPendingFollowUps([]);
        setRankingBias({});
        setDecision(null);
        setStructuredNeeds(null);
        setActiveCaseId(null);
      },
    }),
    [
      narrative,
      fastResult,
      pendingFollowUps,
      rankingBias,
      decision,
      structuredNeeds,
      activeCaseId,
    ]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
