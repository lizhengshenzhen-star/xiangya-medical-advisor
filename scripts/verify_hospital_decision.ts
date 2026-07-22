/**
 * 医院相对优势层验收脚本（不依赖 Vite）
 * 运行：npx --yes tsx scripts/verify_hospital_decision.ts
 */
import { classifyDiseaseScenario } from "../src/services/diseaseScenarioClassifier.ts";
import {
  decideHospital,
  formatHospitalDecisionMarkdown,
} from "../src/services/hospitalDecisionEngine.ts";

function runCase(
  name: string,
  input: { city: string; symptoms: string[] },
  expect: { scenario: string; hospitalIncludes: string; extra?: (md: string) => void }
) {
  const scenario = classifyDiseaseScenario({
    symptoms: input.symptoms,
    chiefComplaint: input.symptoms.join("、"),
  });
  const decision = decideHospital({
    city: input.city,
    scenario: scenario.scenario,
    symptoms: input.symptoms,
  });
  const md = formatHospitalDecisionMarkdown(decision);

  const okScenario = scenario.scenario === expect.scenario;
  const okHospital =
    expect.hospitalIncludes === "湘雅医院"
      ? decision.primaryHospital === "中南大学湘雅医院"
      : decision.primaryHospital.includes(expect.hospitalIncludes);
  const okWhyNot = md.includes("为什么不是") || md.includes("立即行动");
  const okReasons = decision.reasons.length >= 2;

  console.log(`\n=== ${name} ===`);
  console.log("scenario:", scenario.scenario, "confidence:", scenario.confidence);
  console.log("matched:", scenario.matchedKeywords.join(", "));
  console.log("primary:", decision.primaryHospital, "conf:", decision.confidence);
  console.log("urgency:", decision.urgency);
  console.log(
    "checks:",
    { okScenario, okHospital, okWhyNot, okReasons },
    okScenario && okHospital && okWhyNot && okReasons ? "PASS" : "FAIL"
  );
  console.log(md);
  expect.extra?.(md);

  if (!(okScenario && okHospital && okWhyNot && okReasons)) {
    process.exitCode = 1;
  }
}

runCase(
  "用例1 精神心理",
  { city: "长沙", symptoms: ["焦虑", "失眠", "惊恐发作"] },
  {
    scenario: "精神心理",
    hospitalIncludes: "湘雅二",
    extra: (md) => {
      if (!md.includes("湘雅本部") && !md.includes("为什么不是")) {
        console.log("WARN: missing 为什么不是湘雅本部 style section");
        process.exitCode = 1;
      }
    },
  }
);

runCase(
  "用例2 神经外科疑难",
  { city: "长沙", symptoms: ["脑动脉瘤", "头痛", "视物重影"] },
  { scenario: "神经外科疑难", hospitalIncludes: "湘雅医院" }
);

runCase(
  "用例3 急危重症",
  { city: "长沙", symptoms: ["突发胸痛", "大汗", "呼吸困难"] },
  {
    scenario: "急危重症",
    hospitalIncludes: "湘雅二",
    extra: (md) => {
      if (!md.includes("立即") && !md.includes("急诊")) {
        console.log("FAIL: emergency action missing");
        process.exitCode = 1;
      }
    },
  }
);
