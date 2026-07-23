import type { DoctorProfile } from "../models/types";

export type DoctorGender = "female" | "male" | "unknown";
export type PreferredGender = "female" | "male";

/** 公开资料里明确标注性别时优先采用 */
const FEMALE_MARKERS = /(?:^|[，,、\s])女(?:性|医生|医师|大夫)?[，,、\s]|女，|，女|女性医师|女博士/;
const MALE_MARKERS = /(?:^|[，,、\s])男(?:性|医生|医师|大夫)?[，,、\s]|男，|，男|男性医师/;

/** 常见女性名用字（仅作弱推断，置信度有限） */
const FEMALE_NAME_CHARS = new Set(
  "婷瑶慧梅丽燕萍萱莹娟茜霞芳琳娜静倩雪屏香蕾媛蓉莉薇佳怡欣悦婷娟芳娜芳雯娴蓉婷".split(""),
);
const MALE_NAME_CHARS = new Set(
  "伟强军峰辉晖鹏涛磊勇刚明华东斌波超龙杰浩宇鑫刚健勇辉".split(""),
);

/** 心理咨询/精神心理方向人工校对（公开知名度高） */
const GENDER_OVERRIDES: Record<string, DoctorGender> = {
  姚树桥: "male",
  吴大兴: "male",
  朱熊兆: "male",
  蔡太生: "male",
  罗兴伟: "male",
  李卫晖: "male",
  王绪轶: "male",
  李楚婷: "female",
  蚁金瑶: "female",
  向慧: "female",
  唐慧: "female",
  廖梅: "female",
  张丽: "female",
  张燕: "female",
  曹玉萍: "female",
  欧阳萱: "female",
  申艳梅: "female",
  贺莹: "female",
  陶好娟: "female",
  高雪屏: "female",
  黄春香: "female",
  吴秋霞: "female",
  肖茜: "female",
  董慧茜: "female",
  李建玲: "female",
};

export function detectPreferredGender(text: string): PreferredGender | undefined {
  if (
    /女医生|女大夫|女医师|女性医生|女心理|女咨询|女的医生|女性咨询|女咨询师|女心理师|最好是女|最好.*女|希望.*女|想找.*女|只要.*女|偏好女|要求女|需要女医生/.test(
      text,
    )
  ) {
    return "female";
  }
  if (
    /男医生|男大夫|男医师|男性医生|男心理|最好是男|最好.*男|希望.*男|想找.*男|只要.*男|偏好男|要求男|需要男医生/.test(
      text,
    )
  ) {
    return "male";
  }
  return undefined;
}

export function inferDoctorGender(doctor: DoctorProfile): DoctorGender {
  if (GENDER_OVERRIDES[doctor.name]) return GENDER_OVERRIDES[doctor.name];

  const blob = `${doctor.specialty || ""} ${doctor.evidence || ""}`;
  if (FEMALE_MARKERS.test(blob)) return "female";
  if (MALE_MARKERS.test(blob)) return "male";

  const given = doctor.name.slice(1); // 去姓
  const last = given.slice(-1);
  if (FEMALE_NAME_CHARS.has(last)) return "female";
  if (MALE_NAME_CHARS.has(last)) return "male";
  return "unknown";
}

export function genderLabel(g: DoctorGender | PreferredGender): string {
  if (g === "female") return "女";
  if (g === "male") return "男";
  return "未标注";
}
