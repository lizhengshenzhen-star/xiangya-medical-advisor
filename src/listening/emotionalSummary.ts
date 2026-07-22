import type { NarrativeParseResult } from "../models/types";
import { sanitizeMedicalText } from "../safety/medicalBoundary";

/**
 * 生成「被理解感」摘要 —— 只表达共情与问题重述，不下诊断。
 */
export function buildEmotionalSummary(
  narrative: string,
  parse: NarrativeParseResult
): string {
  const intent = parse.trueIntent;
  if (
    intent &&
    (intent.modality === "psychological_counseling" ||
      intent.modality === "psychotherapy_cbt")
  ) {
    const evidence =
      intent.evidenceSpans.length > 0
        ? `你提到了「${intent.evidenceSpans.join("」「")}」`
        : "从你的描述里";
    let core = `${evidence}，我理解你的真实意图是要「心理咨询/会谈治疗」`;
    if (intent.modality === "psychotherapy_cbt") {
      core += "，并且更看重认知行为（CBT）取向";
    }
    core += "——这和挂精神科开药不是同一条路径。";
    if (intent.rejectSummary.length) {
      core += `接下来匹配会主动避开：${intent.rejectSummary.join("、")}。`;
    }
    core += "湘雅与附二的科室名称也不一样，我们会按两院实际科室结构来对。";
    return sanitizeMedicalText(core).text;
  }

  const cues = parse.emotionalCues;
  const parts: string[] = [];

  if (cues.includes("对现有路径效果失望")) {
    parts.push("已经治疗一段时间却感觉改善有限");
  }
  if (cues.includes("害怕耽误或结果不确定")) {
    parts.push("最怕继续观望或走错路径会耽误");
  }
  if (cues.includes("希望非单纯药物路径")) {
    parts.push("并不只想长期被开药，更希望有匹配的治疗方式");
  }
  if (cues.includes("对奔波与成本敏感") || parse.constraints.outOfTown) {
    parts.push("同时还要考虑外地奔波与少白跑");
  }
  if (parse.constraints.preferRecoverySpeed) {
    parts.push("对创伤和恢复时间也比较敏感");
  }

  let core =
    parts.length > 0
      ? `我理解你目前最担心的，可能不是立刻找到「最有名的医生」，而是${parts.join("，")}。`
      : "我理解你现在需要的，是先把混乱的信息理清：真正要解决什么、走到哪一步了、下一步怎样才不白跑。";

  if (parse.diseaseArea !== "general") {
    core += "我们会先把你的叙事结构化，再匹配能力方向，而不是按名气排序。";
  } else {
    core += "你还没有给出很清晰的疾病方向也没关系，我们可以用几个关键问题把路径收窄。";
  }

  if (narrative.length < 20) {
    core =
      "你写得还比较短。我先按现有信息理解：你希望有人帮你把就医决策讲清楚。接下来我会问几个关键问题，避免猜错你的真实担忧。";
  }

  return sanitizeMedicalText(core).text;
}
