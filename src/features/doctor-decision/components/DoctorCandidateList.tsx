import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import type { DoctorDecisionCandidate, DoctorDecisionResult } from "../types";
import { DoctorDecisionCard } from "./DoctorDecisionCard";

export function DoctorCandidateList({
  candidates,
  moreDoctors,
}: {
  candidates: DoctorDecisionCandidate[];
  moreDoctors: DoctorDecisionResult["moreDoctors"];
}) {
  const [openMore, setOpenMore] = useState(false);
  const top3 = candidates.slice(0, 3);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          医生推荐结果
        </p>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          1 位主推荐 + 2 位备选
        </h2>
      </div>

      <div className="space-y-4">
        {top3.map((doctor) => (
          <DoctorDecisionCard key={doctor.id} doctor={doctor} />
        ))}
      </div>

      {moreDoctors.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-3">
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => setOpenMore((v) => !v)}
            >
              更多同方向医生
              {openMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {openMore && (
              <ul className="mt-2 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                {moreDoctors.map((d) => (
                  <li key={d.id} className="text-sm text-slate-600 dark:text-slate-300">
                    {d.name}
                    <span className="text-slate-400">
                      {" "}
                      · {d.title} · {d.hospital}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
