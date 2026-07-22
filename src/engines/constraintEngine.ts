import type { ConstraintProfile, StructuredNeeds } from "../models/types";

export function analyzeConstraints(needs: StructuredNeeds): {
  flags: string[];
  processWeightBoost: number;
  materialsHint: string[];
} {
  const c = needs.constraints;
  const flags: string[] = [];
  let processWeightBoost = 0;
  const materialsHint: string[] = [];

  if (c.outOfTown) {
    flags.push("外地患者");
    processWeightBoost += 2;
    materialsHint.push("出发前核对出诊日与院区");
  }
  if (c.preferLessTravel) {
    flags.push("希望少奔波");
    processWeightBoost += 1;
  }
  if (c.timeTight) {
    flags.push("时间紧");
    processWeightBoost += 1;
    materialsHint.push("尽量把检查与看报告排进同一行程");
  }
  if (c.budgetPressure) {
    flags.push("费用压力");
    materialsHint.push("问清本次必要检查，避免重复项目");
  }
  if (c.firstVisit) {
    flags.push("首次就诊");
    materialsHint.push("提前准备身份证/医保卡与外院资料");
  }
  if (c.preferCommunication) flags.push("看重沟通");
  if (c.preferRecoverySpeed) flags.push("看重恢复/微创相关讨论");

  return { flags, processWeightBoost, materialsHint };
}

export function mergeConstraintAnswers(
  base: ConstraintProfile,
  selectedIds: string[]
): ConstraintProfile {
  const next = { ...base };
  if (selectedIds.includes("out")) {
    next.outOfTown = true;
    next.preferLessTravel = true;
  }
  if (selectedIds.includes("time")) next.timeTight = true;
  if (selectedIds.includes("budget")) next.budgetPressure = true;
  if (selectedIds.includes("talk")) next.preferCommunication = true;
  if (selectedIds.includes("first")) next.firstVisit = true;
  return next;
}
