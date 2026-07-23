import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import type { DoctorProfile } from "../../models/types";
import type { DoctorKnowledgeMeta } from "../../models/companion";
import { useCurrentUser } from "../../state/CurrentUserProvider";
import { useRepos } from "../../state/RepoProvider";

export function AdminDoctorsPage() {
  const { doctors, doctorOverlays } = useRepos();
  const { user } = useCurrentUser();
  const [pool, setPool] = useState<DoctorProfile[]>([]);
  const [overlays, setOverlays] = useState<DoctorKnowledgeMeta[]>([]);
  const [q, setQ] = useState("心理");
  const [editing, setEditing] = useState<DoctorProfile | null>(null);
  const [tags, setTags] = useState("");
  const [keywords, setKeywords] = useState("");

  useEffect(() => {
    void Promise.all([doctors.listAll(), doctorOverlays.list()]).then(([d, o]) => {
      setPool(d.filter((x) => !x.isPathCard));
      setOverlays(o);
    });
  }, [doctors, doctorOverlays]);

  const filtered = useMemo(() => {
    const key = q.trim();
    if (!key) return pool.slice(0, 40);
    return pool
      .filter(
        (d) =>
          d.name.includes(key) ||
          d.department.includes(key) ||
          d.capabilityTags.some((t) => t.includes(key)) ||
          (d.specialty || "").includes(key),
      )
      .slice(0, 40);
  }, [pool, q]);

  const overlayMap = useMemo(
    () => new Map(overlays.map((o) => [o.doctorId, o])),
    [overlays],
  );

  return (
    <div className="decision-root mx-auto max-w-[960px] space-y-4 p-4">
      <h1 className="text-2xl font-bold">医生知识库管理</h1>
      <p className="text-sm text-slate-600">
        主数据来自打包医生库；运营标签以本地 overlay 保存，不改动原始 JSON。
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">搜索</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="姓名 / 科室 / 标签"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          {filtered.map((d) => {
            const ov = overlayMap.get(d.id);
            return (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 px-3 py-2 dark:border-slate-700"
              >
                <div>
                  <p className="font-medium">
                    {d.name} · {d.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {d.hospital} · {d.department}
                  </p>
                  <p className="text-xs text-slate-400">
                    能力：{d.capabilityTags.slice(0, 4).join("、")}
                    {ov?.aiTags?.length ? ` · AI标签：${ov.aiTags.join("、")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/admin/doctors/${d.id}`}>
                    <Button size="sm" variant="outline">
                      详情
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditing(d);
                      setTags((ov?.aiTags || []).join(","));
                      setKeywords((ov?.diseaseKeywords || []).join(","));
                    }}
                  >
                    编辑标签
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {editing && (
        <Card className="border-medical-200">
          <CardHeader>
            <CardTitle className="text-base">编辑 overlay · {editing.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <label className="block text-xs text-slate-500">AI 推荐标签（逗号分隔）</label>
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="CBT,抑郁,焦虑,心理治疗"
            />
            <label className="block text-xs text-slate-500">擅长疾病关键词</label>
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  await doctorOverlays.upsert({
                    doctorId: editing.id,
                    aiTags: tags
                      .split(/[,，]/)
                      .map((x) => x.trim())
                      .filter(Boolean),
                    therapyDirections: [],
                    diseaseKeywords: keywords
                      .split(/[,，]/)
                      .map((x) => x.trim())
                      .filter(Boolean),
                    publishStatus: "published",
                    updatedAt: new Date().toISOString(),
                    updatedBy: user?.name || "admin",
                  });
                  setOverlays(await doctorOverlays.list());
                  setEditing(null);
                }}
              >
                保存
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
