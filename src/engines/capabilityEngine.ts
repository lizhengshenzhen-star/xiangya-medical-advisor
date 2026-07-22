import {
  CAPABILITY_LABELS,
  CapabilityTag,
  type DecisionStageId,
  type DiseaseArea,
  type StructuredNeeds,
} from "../models/types";

const AREA_TAGS: Record<DiseaseArea, CapabilityTag[]> = {
  lung: [CapabilityTag.Respiratory],
  heart: [CapabilityTag.Cardiology],
  gi: [CapabilityTag.Gastroenterology],
  neuro: [CapabilityTag.Neurology],
  ortho: [CapabilityTag.Orthopedics],
  // 精神心理大类默认不再单独塞 Psychiatry，避免把所有人都推向精神科
  mental: [],
  general: [CapabilityTag.PathClarification, CapabilityTag.FirstVisitSupport],
};

const STAGE_TAGS: Record<DecisionStageId, CapabilityTag[]> = {
  risk_confirmation: [CapabilityTag.FirstVisitSupport, CapabilityTag.ComplexEvaluation],
  initial_diagnosis: [CapabilityTag.FirstVisitSupport, CapabilityTag.ComplexEvaluation],
  treatment_choice: [CapabilityTag.ComplexEvaluation, CapabilityTag.ConservativeTreatment],
  surgery_decision: [CapabilityTag.SurgeryDecision, CapabilityTag.MinimallyInvasive],
  long_term_management: [CapabilityTag.ChronicManagement],
};

function wantsCounseling(needs: StructuredNeeds): boolean {
  const tags = needs.capabilityNeeds;
  return (
    tags.includes(CapabilityTag.PsychologicalCounseling) ||
    tags.includes(CapabilityTag.Psychotherapy) ||
    tags.includes(CapabilityTag.CBT) ||
    tags.includes(CapabilityTag.ACT) ||
    needs.emotionalCues.some((c) => c.includes("非单纯药物"))
  );
}

export function resolveCapabilityNeeds(
  needs: StructuredNeeds,
  stageId: DecisionStageId
): { tags: CapabilityTag[]; labels: string[] } {
  const tags = new Set<CapabilityTag>([
    ...AREA_TAGS[needs.diseaseArea],
    ...STAGE_TAGS[stageId],
    ...needs.capabilityNeeds,
  ]);

  if (needs.constraints.outOfTown) tags.add(CapabilityTag.ExternalPatientProcess);
  if (needs.constraints.preferCommunication) tags.add(CapabilityTag.ClearCommunication);
  if (needs.constraints.firstVisit) tags.add(CapabilityTag.FirstVisitSupport);
  if (needs.constraints.preferRecoverySpeed) tags.add(CapabilityTag.MinimallyInvasive);

  if (needs.diseaseArea === "mental") {
    const modality = needs.trueIntent?.modality;
    if (
      modality === "psychological_counseling" ||
      modality === "psychotherapy_cbt" ||
      wantsCounseling(needs)
    ) {
      tags.add(CapabilityTag.PsychologicalCounseling);
      tags.add(CapabilityTag.Psychotherapy);
      tags.add(CapabilityTag.DepressionManagement);
      tags.delete(CapabilityTag.PsychiatryMedication);
      tags.delete(CapabilityTag.MentalHealth);
      if (modality === "psychotherapy_cbt") tags.add(CapabilityTag.CBT);
    } else if (modality === "psychiatry_medication" || tags.has(CapabilityTag.PsychiatryMedication)) {
      tags.add(CapabilityTag.MentalHealth);
      tags.add(CapabilityTag.DepressionManagement);
      tags.add(CapabilityTag.PsychiatryMedication);
    } else if (modality === "combined") {
      tags.add(CapabilityTag.PsychologicalCounseling);
      tags.add(CapabilityTag.PsychiatryMedication);
      tags.add(CapabilityTag.DepressionManagement);
    } else {
      tags.add(CapabilityTag.PsychologicalCounseling);
      tags.add(CapabilityTag.MentalHealth);
      tags.add(CapabilityTag.DepressionManagement);
    }
  }

  const list = [...tags];
  return {
    tags: list,
    labels: list.map((t) => CAPABILITY_LABELS[t]),
  };
}
