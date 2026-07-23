import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { CapabilityRoadmapPanel } from "../../features/companion/CapabilityRoadmapPanel";
import type { ConsultRecord } from "../../models/companion";
import { FEEDBACK_RATING_LABELS } from "../../models/companion";
import { useCurrentUser } from "../../state/CurrentUserProvider";
import { useRepos } from "../../state/RepoProvider";

export function AppHomePage() {
  const { consults, analytics } = useRepos();
  const { user } = useCurrentUser();
  const [recent, setRecent] = useState<ConsultRecord[]>([]);

  useEffect(() => {
    void consults.list().then((list) => setRecent(list.slice(0, 5)));
  }, [consults]);

  return (
    <div className="decision-root mx-auto max-w-[720px] space-y-4 p-4">
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-medical-600">
          陪诊师工作台
        </p>
        <h1 className="text-2xl font-bold text-slate-900">你好，{user?.name || "同事"}</h1>
        <p className="mt-1 text-sm text-slate-600">
          用 AI 理解患者需求，快速匹配最合适的医生。第一阶段重点验证推荐是否准确。
        </p>
      </section>

      <Card className="border-medical-200 bg-gradient-to-br from-medical-50 to-white">
        <CardHeader>
          <CardTitle>AI 医生匹配</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link to="/app/match">
            <Button size="lg">新建患者匹配</Button>
          </Link>
          <Link to="/app/history">
            <Button variant="outline">查看咨询记录</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">最近咨询</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">暂无记录，先完成一次匹配。</p>
          ) : (
            recent.map((c) => (
              <Link
                key={c.id}
                to={`/app/history/${c.id}`}
                className="block rounded-2xl border border-slate-100 px-3 py-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-1">
                  {c.inputText}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(c.createdAt).toLocaleString("zh-CN")} · 主推{" "}
                  {c.recommendations[0]?.name || "—"}
                  {c.feedback
                    ? ` · ${FEEDBACK_RATING_LABELS[c.feedback.rating]}`
                    : " · 待反馈"}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <CapabilityRoadmapPanel
        onInterest={(featureKey) => {
          if (!user) return;
          void analytics.track({
            type: "capability_interest_clicked",
            userId: user.id,
            payload: { featureKey },
          });
          alert("已记录你的兴趣，感谢反馈。");
        }}
      />
    </div>
  );
}
