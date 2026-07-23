import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import type { ConsultRecord } from "../../models/companion";
import { aggregateDashboard } from "../../services/analyticsService";
import { useRepos } from "../../state/RepoProvider";

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max ? Math.round((count / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-600">
        <span className="truncate pr-2">{label}</span>
        <span>{count}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-2 rounded-full bg-medical-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { consults } = useRepos();
  const [list, setList] = useState<ConsultRecord[]>([]);

  useEffect(() => {
    void consults.list().then(setList);
  }, [consults]);

  const stats = useMemo(() => aggregateDashboard(list), [list]);
  const maxDisease = Math.max(1, ...stats.diseaseBreakdown.map((x) => x.count));
  const maxDoctor = Math.max(1, ...stats.topDoctors.map((x) => x.count));

  return (
    <div className="decision-root mx-auto max-w-[960px] space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">数据分析看板</h1>
          <p className="text-sm text-slate-600">基于本地咨询与反馈沉淀，验证 AI 推荐效果。</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link className="text-medical-700 underline" to="/admin/consults">
            咨询记录
          </Link>
          <Link className="text-medical-700 underline" to="/admin/users">
            用户
          </Link>
          <Link className="text-medical-700 underline" to="/admin/doctors">
            医生库
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["累计咨询", stats.totalConsults],
          ["今日咨询", stats.todayConsults],
          ["活跃用户", stats.activeUsers],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">疾病分类占比</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.diseaseBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500">暂无数据</p>
            ) : (
              stats.diseaseBreakdown.map((x) => (
                <Bar key={x.label} label={x.label} count={x.count} max={maxDisease} />
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">TOP 推荐医生</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topDoctors.length === 0 ? (
              <p className="text-sm text-slate-500">暂无数据</p>
            ) : (
              stats.topDoctors.map((x) => (
                <Bar key={x.name} label={x.name} count={x.count} max={maxDoctor} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            AI 效果 · 反馈覆盖率 {stats.feedbackRate}%
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          {stats.satisfaction.map((s) => (
            <div key={s.label} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-xl font-semibold">
                {s.count} <span className="text-sm text-slate-400">({s.pct}%)</span>
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">热门搜索问题</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {stats.hotQueries.map((q) => (
            <p key={q.text} className="truncate text-slate-700 dark:text-slate-200">
              {q.count}× {q.text}
            </p>
          ))}
          {stats.hotQueries.length === 0 && <p className="text-slate-500">暂无</p>}
        </CardContent>
      </Card>
    </div>
  );
}
