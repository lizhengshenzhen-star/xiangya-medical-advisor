import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import type { DoctorKnowledgeMeta } from "../../models/companion";
import type { DoctorProfile } from "../../models/types";
import { useRepos } from "../../state/RepoProvider";

export function AdminDoctorDetailPage() {
  const { id = "" } = useParams();
  const { doctors, doctorOverlays } = useRepos();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [overlay, setOverlay] = useState<DoctorKnowledgeMeta | null>(null);

  useEffect(() => {
    void doctors.listAll().then((all) => setDoctor(all.find((d) => d.id === id) || null));
    void doctorOverlays.get(id).then((o) => setOverlay(o || null));
  }, [doctors, doctorOverlays, id]);

  if (!doctor) {
    return <div className="p-4 text-sm text-slate-500">未找到医生</div>;
  }

  return (
    <div className="decision-root mx-auto max-w-[720px] space-y-4 p-4">
      <Link to="/admin/doctors">
        <Button variant="ghost" size="sm">
          ← 返回知识库
        </Button>
      </Link>
      <h1 className="text-2xl font-bold">{doctor.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基础档案</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            {doctor.hospital} · {doctor.department}
          </p>
          <p>
            {doctor.title} · 角色 {doctor.serviceRole}
          </p>
          <div className="flex flex-wrap gap-1">
            {doctor.capabilityTags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
          <p className="text-slate-600 dark:text-slate-300">{doctor.evidence}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">运营 overlay</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {overlay ? (
            <div className="space-y-2">
              <p>AI 标签：{overlay.aiTags.join("、") || "—"}</p>
              <p>疾病关键词：{overlay.diseaseKeywords.join("、") || "—"}</p>
              <p className="text-xs text-slate-400">
                更新于 {new Date(overlay.updatedAt).toLocaleString("zh-CN")} ·{" "}
                {overlay.updatedBy}
              </p>
            </div>
          ) : (
            <p className="text-slate-500">尚未配置 overlay，可在列表页编辑。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
