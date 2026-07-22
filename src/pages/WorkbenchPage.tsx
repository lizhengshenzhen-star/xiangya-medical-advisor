import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CaseRecord } from "../models/types";
import { toShareableMarkdown } from "../engines/explanationEngine";
import { useRepos } from "../state/RepoProvider";

export function WorkbenchPage() {
  const { cases, doctors } = useRepos();
  const [list, setList] = useState<CaseRecord[]>([]);
  const meta = doctors.getLibraryMeta();

  useEffect(() => {
    void cases.list().then(setList);
  }, [cases]);

  return (
    <div className="panel">
      <h1 className="page-title">陪诊工作台</h1>
      <p className="muted">
        医生信息库：v{meta.version} · 共 {meta.count} 人 · 更新于 {meta.updatedAt}
        。维护目录：<code>src/data/doctor-library/</code>
      </p>
      <p className="muted">
        决策草稿与可分享报告在此沉淀。回填真实结果请前往{" "}
        <Link to="/replay">案例回放</Link>。
      </p>
      {list.length === 0 ? (
        <p className="empty-hint">暂无案例，先引导客户完成叙事决策。</p>
      ) : (
        <div className="case-list">
          {list.map((c) => (
            <div key={c.id} className="case-item">
              <div>
                <h3>
                  {c.aiDecision.stageDisplayLabel || c.aiDecision.stage.label}
                </h3>
                <p>
                  {new Date(c.createdAt).toLocaleString("zh-CN")} ·{" "}
                  {c.aiDecision.matchedDoctors.map((d) => d.name).join("、")}
                </p>
                <p className="clamp">{c.initialNarrative}</p>
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      toShareableMarkdown(c.aiDecision)
                    );
                    alert("报告已复制");
                  }}
                >
                  复制报告
                </button>
                <Link className="btn btn-ghost" to="/replay">
                  回放
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={async () => {
                    await cases.remove(c.id);
                    setList(await cases.list());
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
