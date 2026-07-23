import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import type { ConsultRecord } from "../../models/companion";
import { FEEDBACK_MISS_LABELS, FEEDBACK_RATING_LABELS } from "../../models/companion";
import { useRepos } from "../../state/RepoProvider";

export function HistoryDetailPage() {
  const { id = "" } = useParams();
  const { consults } = useRepos();
  const [c, setC] = useState<ConsultRecord | null>(null);

  useEffect(() => {
    void consults.get(id).then((x) => setC(x || null));
  }, [consults, id]);

  if (!c) {
    return <div className="p-4 text-sm text-slate-500">记录不存在</div>;
  }

  return (
    <div className="decision-root mx-auto max-w-[820px] space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">咨询链路</h1>
        <Link to={`/app/result/${c.id}`}>
          <Button variant="outline">打开结果页</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. 用户输入</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">{c.inputText}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. AI 分析结果</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge>疾病方向 · {c.patientProfile.diseaseDirection}</Badge>
          <Badge variant="secondary">核心诉求 · {c.patientProfile.coreNeed}</Badge>
          <Badge variant="secondary">治疗偏好 · {c.patientProfile.treatmentPreference}</Badge>
          <Badge variant="outline">就诊目标 · {c.patientProfile.visitGoal}</Badge>
          <Badge variant="outline">紧急程度 · {c.patientProfile.urgencyLabel}</Badge>
          <Badge variant="success">置信度 · {c.patientProfile.confidencePercent}%</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. 医生推荐</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {c.recommendations.map((r) => (
            <div key={r.doctorId} className="rounded-2xl border border-slate-100 p-3 dark:border-slate-700">
              <p className="font-semibold">
                {r.role === "primary" ? "主推荐" : "备选"} · {r.name} · {r.matchScore}分
              </p>
              <p className="text-xs text-slate-500">
                {r.hospital} · {r.department} · {r.title}
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{r.personalizedReason}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. 用户反馈</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {c.feedback ? (
            <div className="space-y-2">
              <Badge variant="success">{FEEDBACK_RATING_LABELS[c.feedback.rating]}</Badge>
              {c.feedback.missReasons?.map((r) => (
                <Badge key={r} variant="warn">
                  {FEEDBACK_MISS_LABELS[r]}
                </Badge>
              ))}
              {c.feedback.comment && <p>{c.feedback.comment}</p>}
            </div>
          ) : (
            <p className="text-slate-500">尚未反馈</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
