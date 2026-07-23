import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import type { PatientProfile } from "../types";

/** 患者需求识别（陪诊师工作台） */
export function PatientProfileCard({ profile }: { profile: PatientProfile }) {
  return (
    <Card className="sticky top-0 z-30 border-medical-200/80 bg-gradient-to-br from-medical-50 via-white to-medical-100/60 dark:border-medical-800 dark:from-slate-900 dark:via-slate-900 dark:to-medical-950/40">
      <CardHeader className="pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-medical-600 dark:text-medical-300">
          患者需求识别
        </p>
        <CardTitle className="text-[15px]">AI 结构化患者画像</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[32vh] overflow-auto pt-1">
        <dl className="grid gap-2 text-sm">
          <div className="flex flex-wrap items-baseline gap-2">
            <dt className="text-xs text-slate-500">疾病方向</dt>
            <dd>
              <Badge>{profile.diseaseDirection || profile.coreNeed}</Badge>
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <dt className="text-xs text-slate-500">核心诉求</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">{profile.coreNeed}</dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <dt className="text-xs text-slate-500">治疗偏好</dt>
            <dd>
              <Badge variant="secondary">{profile.treatmentPreference}</Badge>
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <dt className="text-xs text-slate-500">就诊目标</dt>
            <dd className="text-slate-700 dark:text-slate-200">{profile.visitGoal}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">紧急程度 · {profile.riskLevel}</Badge>
            <Badge variant="success">置信度 · {profile.confidencePercent}%</Badge>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
