import { runFastRecommend } from "../src/services/fastRecommendPipeline";
import { loadDoctorLibrary } from "../src/data/doctor-library";

const docs = loadDoctorLibrary();
const cases = [
  {
    text: "长沙失眠焦虑挂哪个医生？",
    assert: (r: ReturnType<typeof runFastRecommend>) =>
      r.intent.diseaseScenario === "精神心理" &&
      r.candidates[0]?.hospital.includes("湘雅二") &&
      r.followUps.length <= 1,
  },
  {
    text: "肺结节想找擅长手术评估的医生。",
    assert: (r: ReturnType<typeof runFastRecommend>) =>
      r.intent.diseaseScenario === "呼吸与胸部" &&
      /胸外/.test(r.candidates[0]?.department || "") &&
      r.followUps.every((q) => !/年龄|性别|身高|体重/.test(q.prompt)),
  },
  {
    text: "我爸突然说话含糊右手没劲。",
    assert: (r: ReturnType<typeof runFastRecommend>) =>
      r.isEmergency &&
      r.candidates[0]?.bookingHint === "急诊" &&
      r.followUps.length === 0,
  },
];

let fail = 0;
for (const c of cases) {
  const r = runFastRecommend({ text: c.text, doctors: docs });
  const p = r.candidates[0];
  const ok = c.assert(r);
  console.log("\n===", c.text);
  console.log(
    ok ? "PASS" : "FAIL",
    "|",
    r.intent.diseaseScenario,
    "|",
    p?.hospital,
    p?.department,
    "| followUps=",
    r.followUps.length
  );
  if (!ok) fail += 1;
}
process.exit(fail ? 1 : 0);
