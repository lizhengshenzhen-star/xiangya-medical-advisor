import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import type { ConsultRecord } from "../../models/companion";
import { FEEDBACK_RATING_LABELS } from "../../models/companion";
import { useRepos } from "../../state/RepoProvider";

export function HistoryPage() {
  const { consults } = useRepos();
  const [list, setList] = useState<ConsultRecord[]>([]);

  const reload = async () => setList(await consults.list());

  useEffect(() => {
    void reload();
  }, [consults]);

  return (
    <div className="decision-root mx-auto max-w-[820px] space-y-4 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">咨询记录</h1>
          <p className="text-sm text-slate-600">回看 AI 画像、推荐与反馈，用于验证准确度。</p>
        </div>
        <Link to="/app/match">
          <Button>新建匹配</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">全部记录（{list.length}）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {list.length === 0 ? (
            <p className="text-sm text-slate-500">暂无咨询。完成匹配后会自动落库。</p>
          ) : (
            list.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 px-3 py-2 dark:border-slate-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.inputText}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(c.createdAt).toLocaleString("zh-CN")} · {c.userName} ·{" "}
                    {c.patientProfile.diseaseDirection} · 主推{" "}
                    {c.recommendations[0]?.name || "—"}
                    {c.feedback
                      ? ` · ${FEEDBACK_RATING_LABELS[c.feedback.rating]}`
                      : " · 待反馈"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/app/result/${c.id}`}>
                    <Button size="sm" variant="secondary">
                      结果
                    </Button>
                  </Link>
                  <Link to={`/app/history/${c.id}`}>
                    <Button size="sm" variant="outline">
                      链路
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await consults.remove(c.id);
                      await reload();
                    }}
                  >
                    删除
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
