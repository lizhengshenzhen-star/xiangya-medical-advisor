import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CapabilityRoadmapPanel } from "../../features/companion/CapabilityRoadmapPanel";
import { RecommendFeedbackPanel } from "../../features/companion/RecommendFeedbackPanel";
import { DoctorDecisionResultPage } from "../../features/doctor-decision";
import type { DoctorDecisionResult } from "../../features/doctor-decision/types";
import type { ConsultRecord } from "../../models/companion";
import { submitConsultFeedback } from "../../services/consultService";
import { useCurrentUser } from "../../state/CurrentUserProvider";
import { useRepos } from "../../state/RepoProvider";

function consultToDecision(c: ConsultRecord): DoctorDecisionResult {
  return {
    profile: {
      diseaseDirection: c.patientProfile.diseaseDirection,
      coreNeed: c.patientProfile.coreNeed,
      treatmentPreference: c.patientProfile.treatmentPreference,
      visitGoal: c.patientProfile.visitGoal,
      riskLevel:
        c.patientProfile.urgencyLabel === "高危，优先急诊"
          ? "高危，优先急诊"
          : c.patientProfile.urgencyLabel === "建议尽快门诊"
            ? "建议尽快门诊"
            : "非急诊，可预约",
      confidencePercent: c.patientProfile.confidencePercent,
    },
    decisionSummary: [
      c.decisionSummary[0] || "已完成路径匹配",
      c.decisionSummary[1] || "请查看主推荐与备选",
      c.decisionSummary[2] || `当前最推荐：${c.recommendations[0]?.name || "—"}`,
    ],
    candidates: c.recommendations.map((r, i) => ({
      id: r.doctorId,
      role: i === 0 ? "primary" : i === 1 ? "alternative" : "styleAlternative",
      name: r.name,
      avatarInitials: r.name.slice(0, 1),
      hospital: r.hospital,
      department: r.department,
      title: r.title,
      academicLevel: r.academicLevel,
      matchScore: r.matchScore,
      matchLevel: (r.matchLevel as "高" | "中" | "低") || "中",
      scoreBreakdown: {
        therapyOrientation: r.matchScore,
        diseaseMatch: r.matchScore,
        talkEvidence: Math.max(60, r.matchScore - 5),
        firstVisitFriendly: 80,
        bookingConvenience: 75,
      },
      scoreExplain: "来自本次咨询落库快照。",
      capabilityTags: r.specialtyTags.slice(0, 4) as DoctorDecisionResult["candidates"][number]["capabilityTags"],
      personalizedReason: r.personalizedReason,
      suitableFor: r.suitableFor,
      notIdealFor: r.notIdealFor,
      bookingType: r.department,
      onlineSupported: Boolean(r.bookingUrl),
      scheduleStatus: "号源以官方平台为准",
      bookingUrl: r.bookingUrl,
    })),
    moreDoctors: [],
    whyNot: [
      ...(c.recommendations[1]
        ? [
            {
              label: c.recommendations[1].name,
              betterFor: "更适合作为约不到主推荐时的替代。",
            },
          ]
        : []),
      {
        label: "普通快速门诊",
        betterFor: "更适合快速评估与处方，不一定适合连续会谈路径。",
      },
    ],
    primaryDoctorName: c.recommendations[0]?.name || "对口医生",
  };
}

export function ResultPage() {
  const { consultId = "" } = useParams();
  const nav = useNavigate();
  const { consults, analytics } = useRepos();
  const { user } = useCurrentUser();
  const [record, setRecord] = useState<ConsultRecord | null>(null);

  useEffect(() => {
    void consults.get(consultId).then((c) => setRecord(c || null));
  }, [consultId, consults]);

  const decision = useMemo(
    () => (record ? consultToDecision(record) : null),
    [record],
  );

  if (!record || !decision) {
    return (
      <div className="decision-root mx-auto max-w-[430px] p-4 text-sm text-slate-500">
        未找到咨询记录，请重新匹配。
      </div>
    );
  }

  return (
    <DoctorDecisionResultPage
      result={decision}
      onRefine={() => nav("/app/match")}
      feedbackSlot={
        <RecommendFeedbackPanel
          existing={record.feedback}
          onSubmit={async (payload) => {
            if (!user) return;
            const updated = await submitConsultFeedback({
              consultId: record.id,
              rating: payload.rating,
              missReasons: payload.missReasons,
              comment: payload.comment,
              userId: user.id,
              consults,
              analytics,
            });
            if (updated) setRecord(updated);
          }}
        />
      }
      roadmapSlot={
        <CapabilityRoadmapPanel
          onInterest={(featureKey) => {
            if (!user) return;
            void analytics.track({
              type: "capability_interest_clicked",
              userId: user.id,
              consultId: record.id,
              payload: { featureKey },
            });
            alert("已记录兴趣");
          }}
        />
      }
    />
  );
}
