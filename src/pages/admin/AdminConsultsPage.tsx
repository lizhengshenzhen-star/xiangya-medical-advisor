import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import type { ConsultRecord } from "../../models/companion";
import { FEEDBACK_RATING_LABELS } from "../../models/companion";
import { useRepos } from "../../state/RepoProvider";

export function AdminConsultsPage() {
  const { consults } = useRepos();
  const [list, setList] = useState<ConsultRecord[]>([]);

  useEffect(() => {
    void consults.list().then(setList);
  }, [consults]);

  return (
    <div className="decision-root mx-auto max-w-[960px] space-y-4 p-4">
      <h1 className="text-2xl font-bold">AI 咨询记录</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">列表</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-2">时间</th>
                <th>使用人员</th>
                <th>患者问题</th>
                <th>疾病方向</th>
                <th>推荐医生</th>
                <th>反馈</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2 whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td>{c.userName}</td>
                  <td className="max-w-[220px] truncate">{c.inputText}</td>
                  <td>{c.patientProfile.diseaseDirection}</td>
                  <td>{c.recommendations.map((r) => r.name).join("、")}</td>
                  <td>
                    {c.feedback ? FEEDBACK_RATING_LABELS[c.feedback.rating] : "—"}
                  </td>
                  <td>
                    <Link to={`/admin/consults/${c.id}`}>
                      <Button size="sm" variant="ghost">
                        链路
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="py-6 text-slate-500">暂无咨询数据</p>}
        </CardContent>
      </Card>
    </div>
  );
}
