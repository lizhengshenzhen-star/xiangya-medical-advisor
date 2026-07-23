import type {
  AppUser,
  ConsultDoctorSnapshot,
  ConsultRecord,
  FeedbackMissReason,
  FeedbackRating,
  RecommendFeedback,
} from "../models/companion";
import type { DoctorDecisionResult } from "../features/doctor-decision/types";
import type { FastRecommendResult } from "./fastRecommendPipeline";
import type { AnalyticsRepository, ConsultRepository } from "../repositories/consultRepository";
import type { UserRepository } from "../repositories/userRepository";
import { genderLabel } from "./doctorGender";

function toSnapshots(decision: DoctorDecisionResult): ConsultDoctorSnapshot[] {
  return decision.candidates.slice(0, 3).map((c, i) => ({
    role: i === 0 ? ("primary" as const) : ("alternative" as const),
    doctorId: c.id,
    name: c.name,
    hospital: c.hospital,
    department: c.department,
    title: c.title,
    academicLevel: c.academicLevel,
    specialtyTags: c.capabilityTags.slice(0, 4),
    matchScore: c.matchScore,
    matchLevel: c.matchLevel,
    personalizedReason: c.personalizedReason,
    suitableFor: c.suitableFor,
    notIdealFor: c.notIdealFor,
    bookingUrl: c.bookingUrl,
  }));
}

export async function createConsultFromMatch(params: {
  user: AppUser;
  inputText: string;
  fastResult: FastRecommendResult;
  decision: DoctorDecisionResult;
  consults: ConsultRepository;
  users: UserRepository;
  analytics: AnalyticsRepository;
}): Promise<ConsultRecord> {
  const { user, inputText, fastResult, decision, consults, users, analytics } = params;
  const now = new Date().toISOString();
  const primary = fastResult.candidates[0];
  const record: ConsultRecord = {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: user.id,
    userName: user.name,
    createdAt: now,
    updatedAt: now,
    inputText,
    patientProfile: {
      diseaseDirection: fastResult.intent.diseaseScenario,
      coreNeed: decision.profile.coreNeed,
      treatmentPreference: decision.profile.treatmentPreference,
      visitGoal: decision.profile.visitGoal,
      urgencyLabel: decision.profile.riskLevel,
      confidencePercent: decision.profile.confidencePercent,
      preferredGender: fastResult.intent.preferredGender
        ? genderLabel(fastResult.intent.preferredGender)
        : undefined,
    },
    recommendations: toSnapshots(decision),
    pipelineTrace: {
      intentScenario: fastResult.intent.diseaseScenario,
      urgency: fastResult.intent.urgency,
      preferredGender: fastResult.intent.preferredGender,
      hospitalPrimary: primary?.hospital,
      departmentPrimary: primary?.department,
      namedDoctorIds: (primary?.namedDoctors || []).map((d) => d.id),
      decisionSummary: [...decision.decisionSummary],
    },
    decisionSummary: [...decision.decisionSummary],
    status: "recommended",
  };

  await consults.save(record);
  await users.touch(user.id, {
    consultCount: user.consultCount + 1,
    lastActiveAt: now,
  });
  await analytics.track({
    type: "recommend_shown",
    userId: user.id,
    consultId: record.id,
  });
  return record;
}

export async function submitConsultFeedback(params: {
  consultId: string;
  rating: FeedbackRating;
  missReasons?: FeedbackMissReason[];
  comment?: string;
  userId: string;
  consults: ConsultRepository;
  analytics: AnalyticsRepository;
}): Promise<ConsultRecord | undefined> {
  const feedback: RecommendFeedback = {
    rating: params.rating,
    missReasons: params.rating === "miss" ? params.missReasons : undefined,
    comment: params.comment,
    submittedAt: new Date().toISOString(),
  };
  const updated = await params.consults.submitFeedback(params.consultId, feedback);
  if (updated) {
    await params.analytics.track({
      type: "feedback_submitted",
      userId: params.userId,
      consultId: params.consultId,
      payload: { rating: params.rating },
    });
  }
  return updated;
}
