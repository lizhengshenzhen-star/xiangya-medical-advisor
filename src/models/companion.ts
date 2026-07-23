/** 陪诊师决策双端 — 云端就绪的本地数据模型 */

export type AppUserRole = "companion" | "booking_advisor" | "admin";

export interface AppUser {
  id: string;
  name: string;
  role: AppUserRole;
  createdAt: string;
  lastActiveAt: string;
  consultCount: number;
}

export type FeedbackRating = "accurate" | "mostly" | "miss";

export type FeedbackMissReason =
  | "direction_mismatch"
  | "intent_wrong"
  | "doctor_info_thin"
  | "ranking_bad";

export interface RecommendFeedback {
  rating: FeedbackRating;
  missReasons?: FeedbackMissReason[];
  comment?: string;
  submittedAt: string;
}

export interface ConsultPatientProfile {
  diseaseDirection: string;
  coreNeed: string;
  treatmentPreference: string;
  visitGoal: string;
  urgencyLabel: string;
  confidencePercent: number;
  preferredGender?: string;
}

export interface ConsultDoctorSnapshot {
  role: "primary" | "alternative";
  doctorId: string;
  name: string;
  hospital: string;
  department: string;
  title: string;
  academicLevel: string;
  specialtyTags: string[];
  matchScore: number;
  matchLevel: string;
  personalizedReason: string;
  suitableFor: string[];
  notIdealFor: string[];
  bookingUrl?: string;
}

export interface PipelineTrace {
  intentScenario: string;
  urgency: string;
  preferredGender?: string;
  hospitalPrimary?: string;
  departmentPrimary?: string;
  namedDoctorIds: string[];
  decisionSummary: string[];
}

export type ConsultStatus = "recommended" | "feedback_done";

export interface ConsultRecord {
  id: string;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
  inputText: string;
  patientProfile: ConsultPatientProfile;
  recommendations: ConsultDoctorSnapshot[];
  pipelineTrace: PipelineTrace;
  decisionSummary: string[];
  feedback?: RecommendFeedback;
  status: ConsultStatus;
}

export type AnalyticsEventType =
  | "consult_started"
  | "recommend_shown"
  | "feedback_submitted"
  | "capability_interest_clicked";

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  userId: string;
  consultId?: string;
  payload?: Record<string, string>;
  createdAt: string;
}

export type DoctorPublishStatus = "published" | "draft" | "hidden";

export interface DoctorKnowledgeMeta {
  doctorId: string;
  aiTags: string[];
  therapyDirections: string[];
  diseaseKeywords: string[];
  publishStatus: DoctorPublishStatus;
  updatedAt: string;
  updatedBy: string;
}

export const FEEDBACK_RATING_LABELS: Record<FeedbackRating, string> = {
  accurate: "很准确",
  mostly: "基本准确",
  miss: "不符合预期",
};

export const FEEDBACK_MISS_LABELS: Record<FeedbackMissReason, string> = {
  direction_mismatch: "医生方向不匹配",
  intent_wrong: "AI理解患者错误",
  doctor_info_thin: "医生信息不足",
  ranking_bad: "推荐排序不合理",
};

export const ROLE_LABELS: Record<AppUserRole, string> = {
  companion: "陪诊师",
  booking_advisor: "挂号顾问",
  admin: "管理员",
};

export const CAPABILITY_ROADMAP = [
  { key: "visit_plan", title: "AI就诊方案规划", status: "开发中" },
  { key: "report_read", title: "检查报告解读", status: "开发中" },
  { key: "plan_compare", title: "医生方案对比", status: "开发中" },
  { key: "question_list", title: "就诊问题清单生成", status: "开发中" },
  { key: "visit_notes", title: "就诊记录整理", status: "开发中" },
] as const;
