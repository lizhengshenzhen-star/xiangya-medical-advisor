/** 能力标签：禁止自由字符串散落业务逻辑 */
export const CapabilityTag = {
  CBT: "CBT",
  ACT: "ACT",
  DepressionManagement: "depression_management",
  ComplexEvaluation: "complex_evaluation",
  MinimallyInvasive: "minimally_invasive",
  ConservativeTreatment: "conservative_treatment",
  SurgeryDecision: "surgery_decision",
  ChronicManagement: "chronic_management",
  FirstVisitSupport: "first_visit_support",
  Respiratory: "respiratory",
  Thoracic: "thoracic",
  Cardiology: "cardiology",
  Gastroenterology: "gastroenterology",
  Neurology: "neurology",
  Orthopedics: "orthopedics",
  MentalHealth: "mental_health",
  /** 心理咨询（非精神科开药路径） */
  PsychologicalCounseling: "psychological_counseling",
  /** 心理治疗（含会谈治疗关系） */
  Psychotherapy: "psychotherapy",
  /** 精神科药物评估/管理 */
  PsychiatryMedication: "psychiatry_medication",
  PathClarification: "path_clarification",
  ExternalPatientProcess: "external_patient_process",
  ClearCommunication: "clear_communication",
} as const;

export type CapabilityTag = (typeof CapabilityTag)[keyof typeof CapabilityTag];

export const CAPABILITY_LABELS: Record<CapabilityTag, string> = {
  [CapabilityTag.CBT]: "明确开展 CBT（认知行为）相关取向",
  [CapabilityTag.ACT]: "ACT / 接纳承诺相关取向",
  [CapabilityTag.DepressionManagement]: "抑郁症相关长期管理/咨询经验",
  [CapabilityTag.ComplexEvaluation]: "复杂病例评估",
  [CapabilityTag.MinimallyInvasive]: "微创相关评估/技术",
  [CapabilityTag.ConservativeTreatment]: "更偏保守治疗",
  [CapabilityTag.SurgeryDecision]: "手术决策评估",
  [CapabilityTag.ChronicManagement]: "慢病/长期随访管理",
  [CapabilityTag.FirstVisitSupport]: "适合首次建立就诊关系",
  [CapabilityTag.Respiratory]: "呼吸系疾病方向",
  [CapabilityTag.Thoracic]: "胸外科方向",
  [CapabilityTag.Cardiology]: "心血管方向",
  [CapabilityTag.Gastroenterology]: "消化方向",
  [CapabilityTag.Neurology]: "神经内科方向",
  [CapabilityTag.Orthopedics]: "骨科/脊柱关节方向",
  [CapabilityTag.MentalHealth]: "精神心理大类（含精神科）",
  [CapabilityTag.PsychologicalCounseling]: "心理咨询（会谈为主）",
  [CapabilityTag.Psychotherapy]: "心理治疗（非单纯开药）",
  [CapabilityTag.PsychiatryMedication]: "精神科药物评估/管理",
  [CapabilityTag.PathClarification]: "路径澄清 / 分诊支持",
  [CapabilityTag.ExternalPatientProcess]: "对外地患者流程友好",
  [CapabilityTag.ClearCommunication]: "沟通解释相对充分",
};

/** 服务范围：仅湘雅医院 + 湘雅二医院 */
export const HospitalCampus = {
  Xiangya: "xiangya",
  Xiangya2: "xiangya2",
} as const;

export type HospitalCampus = (typeof HospitalCampus)[keyof typeof HospitalCampus];

export const HOSPITAL_CAMPUS_LABELS: Record<HospitalCampus, string> = {
  [HospitalCampus.Xiangya]: "中南大学湘雅医院",
  [HospitalCampus.Xiangya2]: "中南大学湘雅二医院",
};

/** 服务角色：避免把精神科当成心理咨询 */
export const ServiceRole = {
  Physician: "physician",
  Psychiatrist: "psychiatrist",
  ClinicalPsychologist: "clinical_psychologist",
  Counselor: "counselor",
  Path: "path",
} as const;

export type ServiceRole = (typeof ServiceRole)[keyof typeof ServiceRole];

export type DecisionStageId =
  | "risk_confirmation"
  | "initial_diagnosis"
  | "treatment_choice"
  | "surgery_decision"
  | "long_term_management";

export interface DecisionStage {
  id: DecisionStageId;
  label: string;
  focus: string;
}

export const DECISION_STAGES: Record<DecisionStageId, DecisionStage> = {
  risk_confirmation: {
    id: "risk_confirmation",
    label: "风险确认阶段",
    focus: "先完成规范评估，弄清「要不要紧」",
  },
  initial_diagnosis: {
    id: "initial_diagnosis",
    label: "初步诊断阶段",
    focus: "找对科室与首诊路径，备齐材料",
  },
  treatment_choice: {
    id: "treatment_choice",
    label: "治疗方案选择阶段",
    focus: "比较方案差异，匹配对应能力方向",
  },
  surgery_decision: {
    id: "surgery_decision",
    label: "手术决策阶段",
    focus: "带着关键问题去评估适应证与方式",
  },
  long_term_management: {
    id: "long_term_management",
    label: "长期管理阶段",
    focus: "建立可持续随访与治疗关系",
  },
};

export type DiseaseArea =
  | "lung"
  | "heart"
  | "gi"
  | "neuro"
  | "ortho"
  | "mental"
  | "general";

export type EvidenceLevel = "strong" | "medium" | "weak" | "insufficient";
export type MatchLevel = "高" | "中" | "低";
export type CommunicationStyle = "explanatory" | "concise" | "unknown";

export interface DoctorReviewSignals {
  sampleCount: number;
  positiveAttitude: number;
  negativeAttitude: number;
  snippets: string[];
}

export interface DoctorProfile {
  id: string;
  name: string;
  hospital: string;
  /** 湘雅 / 附二（本产品仅覆盖两院） */
  hospitalCampus: HospitalCampus;
  /** 跨院稳定科室编码（各院显示名不同） */
  departmentCode: string;
  department: string;
  title: string;
  serviceRole: ServiceRole;
  capabilityTags: CapabilityTag[];
  evidence: string;
  evidenceLevel: EvidenceLevel;
  firstVisitFriendly: boolean;
  externalPatientFriendly: boolean;
  conservativePreference: boolean;
  surgeryPreference: boolean;
  communicationStyle: CommunicationStyle;
  lastVerifiedAt: string;
  uncertainty: string;
  isPathCard?: boolean;
  /** 公开来源备注 */
  sources?: string[];
  /** 好大夫医生 ID（若来自该平台） */
  haodfDoctorId?: string;
  /** 公开擅长/简介摘录 */
  specialty?: string;
  /** 公开患者评价弱信号（非疗效承诺） */
  reviewSignals?: DoctorReviewSignals;
}

export interface ConstraintProfile {
  outOfTown: boolean;
  firstVisit: boolean;
  timeTight: boolean;
  budgetPressure: boolean;
  preferCommunication: boolean;
  preferRecoverySpeed: boolean;
  preferLessTravel: boolean;
}

export interface TrueIntentSnapshot {
  modality: string;
  confidence: number;
  summary: string;
  rejectSummary: string[];
  evidenceSpans: string[];
  preferRoles: string[];
  excludeRoles: string[];
  skipModalityQuestion: boolean;
}

export interface StructuredNeeds {
  diseaseArea: DiseaseArea;
  emotionalCues: string[];
  constraints: ConstraintProfile;
  stageCandidates: DecisionStageId[];
  riskSignals: string[];
  capabilityNeeds: CapabilityTag[];
  /** 工作流第一层：真实就医意图 */
  trueIntent?: TrueIntentSnapshot;
  priorityWeights: {
    capability: number;
    process: number;
    talk: number;
    cost: number;
  };
}

export interface NarrativeParseResult {
  diseaseArea: DiseaseArea;
  emotionalCues: string[];
  constraints: ConstraintProfile;
  stageCandidates: DecisionStageId[];
  riskSignals: string[];
  gapsToAsk: string[];
  rawSignals: string[];
  trueIntent: TrueIntentSnapshot;
}

export interface DynamicQuestion {
  id: string;
  prompt: string;
  why: string;
  options: { id: string; label: string; patch: Partial<StructuredNeeds> | Record<string, unknown> }[];
  multi?: boolean;
}

export interface MatchedDoctor extends DoctorProfile {
  score: number;
  matchLevel: MatchLevel;
  matchReasons: string[];
}

export interface ActionPriorityItem {
  rank: 1 | 2 | 3;
  title: string;
  reason: string;
}

export interface PathDifferentiation {
  doctorId: string;
  betterFor: string;
  lessSuitableFor: string;
}

export interface TenSecondSummary {
  items: [string, string, string];
  /** 总字数控制提示用 */
  charCount: number;
}

/** 医院相对优势决策（场景 → 优先院区） */
export interface HospitalVisitDecision {
  scenario: string;
  scenarioConfidence: number;
  matchedKeywords: string[];
  primaryHospital: string;
  primaryCampus: HospitalCampus;
  primaryDisplayLabel: string;
  confidence: number;
  reasons: string[];
  alternativeHospital?: string;
  whyNotAlternative: string;
  suggestedDepartments: string[];
  urgency: "outpatient" | "emergency";
  emergencyAction?: string;
  hasClearAdvantage: boolean;
  markdown: string;
}

export interface AiDecision {
  realProblem: string;
  emotionalSummary: string;
  stage: DecisionStage;
  /** 报告展示用阶段名（可与内部 stage.label 不同） */
  stageDisplayLabel: string;
  stageConfidence: number;
  nextSteps: string[];
  capabilityNeeds: CapabilityTag[];
  capabilityNeedLabels: string[];
  matchedDoctors: MatchedDoctor[];
  rankingLogic: string[];
  uncertainties: string[];
  materials: string[];
  whyEasyToWasteTrip: string;
  commonPitfall: string;
  tenSecondSummary: TenSecondSummary;
  actionPriorities: ActionPriorityItem[];
  priorityBasis: string;
  pathDifferentiations: PathDifferentiation[];
  shareableSections: ShareableReport;
  engineTrace: EngineTrace;
  /** 医院相对优势层：先于医生推荐 */
  hospitalDecision?: HospitalVisitDecision;
}

export interface ShareableReport {
  tenSecondSummary: TenSecondSummary;
  realProblem: string;
  whyWasteTrip: string;
  nextSteps: string[];
  capabilityDirections: string[];
  actionPriorities: ActionPriorityItem[];
  priorityBasis: string;
  candidates: Array<{
    name: string;
    hospital: string;
    department: string;
    matchLevel: MatchLevel;
    evidence: string;
    why: string;
    betterFor: string;
    lessSuitableFor: string;
  }>;
  rankingLogic: string[];
  uncertainties: string[];
  materials: string[];
  hospitalDecisionMarkdown?: string;
}

export interface EngineTrace {
  problemSignals: string[];
  stageScores: Record<string, number>;
  constraintFlags: string[];
  capabilityNeeds: CapabilityTag[];
  matchingScores: Array<{ doctorId: string; score: number; reasons: string[] }>;
  diseaseScenario?: string;
  hospitalPrimary?: string;
}

export type AiMisjudgmentReason =
  | "wrong_stage"
  | "wrong_department"
  | "overweight_title"
  | "ignored_constraint"
  | "weak_evidence_overused"
  | "missed_psychotherapy_need"
  | "other";

export interface CaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  initialNarrative: string;
  structuredNeeds: StructuredNeeds;
  aiDecision: AiDecision;
  companionCorrection?: {
    correctedAt: string;
    note: string;
    adjustedDoctorIds?: string[];
    adjustedStageId?: DecisionStageId;
  };
  finalDoctor?: string;
  doctorActualAdvice?: string;
  patientFinalChoice?: string;
  estimatedCost?: string;
  satisfactionScore?: number;
  reducedTravelFlag?: boolean;
  followUp30d?: string;
  aiMisjudgmentReasons?: AiMisjudgmentReason[];
  aiMisjudgmentNote?: string;
}

export interface DecisionPipelineInput {
  narrative: string;
  parse: NarrativeParseResult;
  structuredNeeds: StructuredNeeds;
  followUpAnswers: Record<string, string | string[]>;
}
