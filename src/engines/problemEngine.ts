import type { StructuredNeeds } from "../models/types";
import { sanitizeMedicalText } from "../safety/medicalBoundary";

export function resolveRealProblem(needs: StructuredNeeds): {
  realProblem: string;
  signals: string[];
  whyWasteTrip: string;
  commonPitfall: string;
} {
  const signals: string[] = [...needs.emotionalCues];
  let realProblem = "你真正要解决的，是把模糊焦虑变成「现在最该做的下一步」。";
  let whyWasteTrip = "很多人容易一上来就抢热门专家号，却还没分清自己处在哪个决策阶段。";
  let commonPitfall = "把「名气」当成「适合当前阶段」的同义词。";

  if (needs.emotionalCues.some((c) => c.includes("耽误") || c.includes("不确定"))) {
    realProblem =
      "你真正要解决的，往往不是病名标签本身，而是「会不会耽误、下一步是否够规范」。";
    whyWasteTrip = "在风险未分层时直接跨城求医，容易多一次无效奔波。";
    signals.push("delay_anxiety");
  }
  if (
    needs.emotionalCues.some((c) => c.includes("非单纯") || c.includes("药物")) ||
    needs.trueIntent?.modality === "psychotherapy_cbt" ||
    needs.trueIntent?.modality === "psychological_counseling"
  ) {
    realProblem =
      "你真正要解决的，是找到治疗方式匹配的路径，而不只是再开一轮药。";
    whyWasteTrip =
      "很多人白跑的典型路径是：看到「精神科专家」就直接挂号，结果进入的是药物复诊流程，而不是心理治疗流程。这样即使医生水平很高，也可能无法满足「想做CBT会谈」的核心诉求。";
    commonPitfall = "把「精神科名气」当成「心理咨询/CBT能力」的同义词。";
    signals.push("therapy_modality");
  }
  if (
    needs.capabilityNeeds.includes("minimally_invasive") ||
    needs.stageCandidates[0] === "surgery_decision"
  ) {
    realProblem =
      "你真正要解决的，是把手术/微创决策拆成可问诊的问题清单，降低盲目选择。";
    whyWasteTrip = "很多人只问「谁刀法好」，却忘了先确认自己是否适合现在做。";
    commonPitfall = "跳过适应证评估，直接点名术者。";
    signals.push("surgery_framing");
  }
  if (needs.constraints.outOfTown || needs.constraints.preferLessTravel) {
    realProblem =
      "你真正要解决的，是在效果与奔波成本之间，先做出「这次行程最划算的路径」。";
    whyWasteTrip = "外地患者若材料不齐或出诊日未核，最容易白跑。";
    signals.push("travel_cost");
  }
  if (needs.diseaseArea === "general") {
    realProblem = "你真正要解决的，是先挂对入口、少白跑，而不是立刻锁定某位名医。";
    whyWasteTrip = "方向未清时挂错专科，会消耗时间与号源机会。";
    signals.push("path_unclear");
  }

  return {
    realProblem: sanitizeMedicalText(realProblem).text,
    signals,
    whyWasteTrip: sanitizeMedicalText(whyWasteTrip).text,
    commonPitfall: sanitizeMedicalText(commonPitfall).text,
  };
}
