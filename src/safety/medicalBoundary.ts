/**
 * 合规护栏：统一拦截诊断/用药/疗效承诺/绝对化推荐表述
 * 原则：AI 可表达理解，不可越界诊疗。
 */

const BLOCKED_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /你(就是|确诊|患有|得了)/g, reason: "诊断性表述" },
  { re: /(确诊为|明确诊断|可以断定是)/g, reason: "诊断性表述" },
  { re: /(开药|处方|服用|剂量|mg|毫克).{0,12}(建议|应该|必须)/g, reason: "药物推荐" },
  { re: /(建议|应该|必须).{0,12}(开药|处方|服用)/g, reason: "药物推荐" },
  { re: /(保证|承诺|一定能|百分百).{0,8}(好|治愈|康复|有效)/g, reason: "疗效承诺" },
  { re: /(最好的医生|最佳医生|必须找|一定要挂)/g, reason: "绝对化推荐" },
  { re: /最适合你的医生/g, reason: "绝对化推荐" },
];

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/最好的医生/g, "更匹配当前需求的医生方向"],
  [/最佳医生/g, "更匹配当前阶段的医生能力方向"],
  [/必须找/g, "可优先考虑"],
  [/一定要挂/g, "可优先关注"],
  [/最适合你的医生/g, "相对更匹配当前需求的医生方向"],
  [/你就是/g, "公开信息场景下较常见于"],
  [/确诊为/g, "需由医生进一步确认是否属于"],
  [/保证治愈/g, "建议进一步与医生确认预期"],
  [/一定能好/g, "恢复情况因人而异，建议与医生确认"],
];

export const MEDICAL_DISCLAIMER =
  "本工具提供就医决策辅助，不构成诊断、用药建议或疗效承诺，不能替代执业医师面诊。";

export function sanitizeMedicalText(input: string): {
  text: string;
  blocked: string[];
} {
  const blocked: string[] = [];
  for (const p of BLOCKED_PATTERNS) {
    if (p.re.test(input)) {
      blocked.push(p.reason);
      p.re.lastIndex = 0;
    }
  }
  let text = input;
  for (const [re, to] of REPLACEMENTS) {
    text = text.replace(re, to);
  }
  return { text, blocked: [...new Set(blocked)] };
}

export function assertSafeRecommendationPhrase(phrase: string): string {
  const { text } = sanitizeMedicalText(phrase);
  return text
    .replaceAll("最佳", "较匹配")
    .replaceAll("必须", "建议优先");
}

export function safeMatchWording(level: string): string {
  if (level === "高") return "与当前需求匹配度较高（基于公开信息）";
  if (level === "中") return "与当前阶段需求有一定匹配（仍需线下确认）";
  return "匹配线索有限，建议进一步与医生确认";
}
