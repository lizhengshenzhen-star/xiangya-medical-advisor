import { runFastRecommend } from "../src/services/fastRecommendPipeline";
import { mapFastResultToDecision } from "../src/features/doctor-decision/mapFastResultToDecision";
import { inferDoctorGender } from "../src/services/doctorGender";
import xy2 from "../src/data/doctor-library/campuses/xiangya2.json";
import xy from "../src/data/doctor-library/campuses/xiangya.json";
import type { DoctorProfile } from "../src/models/types";

const doctors = [...xy, ...xy2] as DoctorProfile[];
const t1 = "我想找心理咨询师，擅长抑郁症和认知行为分析";
const t2 = `${t1}；最好是女医生`;

for (const t of [t1, t2]) {
  const r = runFastRecommend({ text: t, doctors });
  const d = mapFastResultToDecision(r, doctors);
  console.log("\n===", t);
  console.log("preferredGender:", r.intent.preferredGender);
  console.log(
    "named:",
    r.candidates[0]?.namedDoctors
      ?.slice(0, 5)
      .map((x) => `${x.name}/${x.gender || "?"}`)
      .join(", "),
  );
  console.log(
    "page:",
    d.candidates.map((c) => `${c.name}/${c.role}/${c.matchScore}`).join(" | "),
  );
  console.log(
    "genders:",
    d.candidates
      .map((c) => {
        const doc = doctors.find((x) => x.id === c.id);
        return `${c.name}=${doc ? inferDoctorGender(doc) : "?"}`;
      })
      .join(", "),
  );
  console.log("summary:", d.decisionSummary.join(" / "));
  console.log("preference tag:", d.profile.treatmentPreference);
}
