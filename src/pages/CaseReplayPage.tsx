import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AiMisjudgmentReason, CaseRecord } from "../models/types";
import { MISJUDGMENT_OPTIONS } from "../repositories/caseRepository";
import { useRepos } from "../state/RepoProvider";

export function CaseReplayPage() {
  const { cases } = useRepos();
  const [list, setList] = useState<CaseRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const reload = async () => {
    const all = await cases.list();
    setList(all);
    if (!activeId && all[0]) setActiveId(all[0].id);
  };

  useEffect(() => {
    void reload();
  }, []);

  const active = list.find((c) => c.id === activeId) || null;

  const saveFeedback = async (patch: Partial<CaseRecord>) => {
    if (!active) return;
    await cases.updateFeedback(active.id, patch);
    await reload();
  };

  return (
    <div className="replay-layout">
      <aside className="panel replay-list">
        <h2>案例回放</h2>
        <p className="muted">闭环数据：AI 建议 → 陪诊修正 → 真实结果</p>
        {list.length === 0 ? (
          <p className="empty-hint">
            暂无案例。<Link to="/">先完成一次决策</Link>
          </p>
        ) : (
          <ul className="case-side-list">
            {list.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={c.id === activeId ? "active" : ""}
                  onClick={() => setActiveId(c.id)}
                >
                  <strong>{c.aiDecision.stage.label}</strong>
                  <span>{new Date(c.createdAt).toLocaleString("zh-CN")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="panel replay-detail">
        {!active ? (
          <p>选择左侧案例查看回放。</p>
        ) : (
          <>
            <h2>AI 当时为什么这样推荐</h2>
            <p className="lead">{active.aiDecision.realProblem}</p>
            <p className="muted">叙事原文：{active.initialNarrative}</p>
            <ul>
              {active.aiDecision.rankingLogic.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p>
              候选：
              {active.aiDecision.matchedDoctors.map((d) => d.name).join("、")}
            </p>

            <h3>引擎痕迹</h3>
            <pre className="trace-pre">
              {JSON.stringify(active.aiDecision.engineTrace, null, 2)}
            </pre>

            <h3>陪诊师修正</h3>
            <textarea
              className="field"
              rows={3}
              placeholder="记录你改了什么、为什么改"
              defaultValue={active.companionCorrection?.note || ""}
              id="correction-note"
            />
            <button
              type="button"
              className="btn btn-soft"
              onClick={() => {
                const note =
                  (document.getElementById("correction-note") as HTMLTextAreaElement)
                    ?.value || "";
                void saveFeedback({
                  companionCorrection: {
                    correctedAt: new Date().toISOString(),
                    note,
                  },
                });
              }}
            >
              保存修正
            </button>

            <h3>最终结果回填</h3>
            <div className="form-grid">
              <label>
                最终挂号医生
                <input
                  className="field"
                  defaultValue={active.finalDoctor || ""}
                  id="final-doctor"
                />
              </label>
              <label>
                医生实际建议
                <input
                  className="field"
                  defaultValue={active.doctorActualAdvice || ""}
                  id="doctor-advice"
                />
              </label>
              <label>
                患者最终选择
                <input
                  className="field"
                  defaultValue={active.patientFinalChoice || ""}
                  id="patient-choice"
                />
              </label>
              <label>
                费用区间
                <input
                  className="field"
                  defaultValue={active.estimatedCost || ""}
                  id="cost"
                />
              </label>
              <label>
                满意度 (1-5)
                <input
                  className="field"
                  type="number"
                  min={1}
                  max={5}
                  defaultValue={active.satisfactionScore || ""}
                  id="sat"
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  id="less-travel"
                  defaultChecked={!!active.reducedTravelFlag}
                />
                是否少白跑
              </label>
              <label className="full">
                30 天随访
                <textarea
                  className="field"
                  rows={2}
                  defaultValue={active.followUp30d || ""}
                  id="follow30"
                />
              </label>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                void saveFeedback({
                  finalDoctor: (
                    document.getElementById("final-doctor") as HTMLInputElement
                  ).value,
                  doctorActualAdvice: (
                    document.getElementById("doctor-advice") as HTMLInputElement
                  ).value,
                  patientFinalChoice: (
                    document.getElementById("patient-choice") as HTMLInputElement
                  ).value,
                  estimatedCost: (document.getElementById("cost") as HTMLInputElement)
                    .value,
                  satisfactionScore: Number(
                    (document.getElementById("sat") as HTMLInputElement).value || 0
                  ),
                  reducedTravelFlag: (
                    document.getElementById("less-travel") as HTMLInputElement
                  ).checked,
                  followUp30d: (
                    document.getElementById("follow30") as HTMLTextAreaElement
                  ).value,
                });
                alert("结果已回填，成为可训练闭环数据");
              }}
            >
              保存真实结果
            </button>

            <h3>标记 AI 误判原因</h3>
            <div className="misjudge-grid">
              {MISJUDGMENT_OPTIONS.map((o) => {
                const checked = active.aiMisjudgmentReasons?.includes(o.id);
                return (
                  <label key={o.id} className="check">
                    <input
                      type="checkbox"
                      checked={!!checked}
                      onChange={(e) => {
                        const cur = new Set(active.aiMisjudgmentReasons || []);
                        if (e.target.checked) cur.add(o.id);
                        else cur.delete(o.id);
                        void saveFeedback({
                          aiMisjudgmentReasons: [...cur] as AiMisjudgmentReason[],
                        });
                      }}
                    />
                    {o.label}
                  </label>
                );
              })}
            </div>
            <textarea
              className="field"
              rows={2}
              placeholder="误判补充说明"
              defaultValue={active.aiMisjudgmentNote || ""}
              id="mis-note"
              onBlur={(e) =>
                void saveFeedback({ aiMisjudgmentNote: e.target.value })
              }
            />
          </>
        )}
      </section>
    </div>
  );
}
