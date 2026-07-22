import { useNavigate } from "react-router-dom";
import { toShareableMarkdown } from "../engines/explanationEngine";
import { MEDICAL_DISCLAIMER, safeMatchWording } from "../safety/medicalBoundary";
import { useSession } from "../state/SessionProvider";
import { HOSPITAL_CAMPUS_LABELS } from "../models/types";

const ROLE_LABEL: Record<string, string> = {
  physician: "专科医师",
  psychiatrist: "精神科医师（药物/精神卫生评估）",
  clinical_psychologist: "临床心理（会谈治疗）",
  counselor: "心理咨询取向",
  path: "路径建议",
};

export function ReportPage() {
  const nav = useNavigate();
  const session = useSession();
  const d = session.decision;

  if (!d) {
    return (
      <div className="panel">
        <p>暂无报告，请先完成叙事与追问。</p>
        <button className="btn btn-primary" onClick={() => nav("/")}>
          返回首页
        </button>
      </div>
    );
  }

  const s = d.shareableSections;
  const diffs = d.pathDifferentiations;

  const copy = async () => {
    const md = toShareableMarkdown(d);
    await navigator.clipboard.writeText(md);
    alert("可分享报告已复制");
  };

  return (
    <article className="report-doc panel">
      {/* 1. 10秒摘要 — 首屏 */}
      <section className="summary-card" aria-label="10秒摘要">
        <p className="eyebrow">医策决策报告</p>
        <h1 className="summary-title">你现在最需要知道的 3 件事</h1>
        <ol className="summary-list">
          {d.tenSecondSummary.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className="summary-meta">
          {d.stageDisplayLabel} · 置信 {d.stageConfidence}
        </p>
      </section>

      <p className="tiny-disclaimer">{MEDICAL_DISCLAIMER}</p>

      {/* 就诊决策：医院相对优势 */}
      {d.hospitalDecision &&
        (d.hospitalDecision.hasClearAdvantage ||
          d.hospitalDecision.urgency === "emergency") && (
          <section className="report-block hospital-decision" aria-label="就诊决策">
            <h2>就诊决策</h2>
            {d.hospitalDecision.urgency === "emergency" && (
              <p className="lead emergency-flag">急危重症取向：优先急诊，非普通门诊</p>
            )}
            <h3>我会优先推荐</h3>
            <p className="lead">
              <strong>{d.hospitalDecision.primaryDisplayLabel}</strong>
              <span className="muted">
                {" "}
                · 置信 {d.hospitalDecision.confidence} · 场景「
                {d.hospitalDecision.scenario}」
              </span>
            </p>
            <h3>推荐理由</h3>
            <ul>
              {d.hospitalDecision.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {d.hospitalDecision.urgency === "emergency" ? (
              <>
                <h3>立即行动</h3>
                <p>{d.hospitalDecision.emergencyAction}</p>
                <h3>为什么不是另一家医院纠结门诊号</h3>
                <p>{d.hospitalDecision.whyNotAlternative}</p>
              </>
            ) : (
              <>
                <h3>
                  为什么不是
                  {d.hospitalDecision.alternativeHospital?.includes("湘雅二")
                    ? "湘雅二医院"
                    : d.hospitalDecision.alternativeHospital?.includes("湘雅医院")
                      ? "湘雅本部"
                      : "备选医院"}
                </h3>
                <p>{d.hospitalDecision.whyNotAlternative}</p>
              </>
            )}
            <h3>下一步</h3>
            <p>
              建议挂：
              {d.hospitalDecision.suggestedDepartments.join(" → ") ||
                "对口专科门诊"}
            </p>
          </section>
        )}

      {/* 2. 倾听摘要 */}
      <section className="report-block empathy">
        <h2>倾听摘要</h2>
        <p className="lead">{d.emotionalSummary}</p>
      </section>

      {/* 3. 真正问题 */}
      <section className="report-block">
        <h2>你真正需要解决的问题</h2>
        <p className="lead">{s.realProblem}</p>
      </section>

      {/* 4. 决策阶段 */}
      <section className="report-block">
        <h2>当前决策阶段</h2>
        <p className="lead">
          {d.stageDisplayLabel}
          <span className="muted"> · 置信 {d.stageConfidence}</span>
        </p>
        <p className="muted">{d.stage.focus}</p>
      </section>

      {/* 5. 明日优先级 — 核心行动模块 */}
      <section className="report-block priority-block">
        <h2>如果你明天就要去医院，我会这样排优先级</h2>
        <p className="priority-basis">排序依据：{d.priorityBasis}</p>
        <ol className="priority-list">
          {d.actionPriorities.map((p) => (
            <li key={p.rank}>
              <div className="priority-rank">第{p.rank}优先</div>
              <div className="priority-title">{p.title}</div>
              <p className="priority-reason">{p.reason}</p>
            </li>
          ))}
        </ol>
        <p className="muted">
          以上为「在当前公开信息下更建议优先考虑」的行动排序，不构成必须执行的医嘱。
        </p>
      </section>

      {/* 6. 白跑 */}
      <section className="report-block">
        <h2>为什么很多人会在这一步白跑</h2>
        <p>{s.whyWasteTrip}</p>
        <p className="muted">常见误区：{d.commonPitfall}</p>
      </section>

      {/* 7. 能力方向 */}
      <section className="report-block">
        <h2>更适合关注的医生能力方向</h2>
        <ul>
          {s.capabilityDirections.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      {/* 8. 候选路径与差异 */}
      <section className="report-block">
        <h2>
          {d.matchedDoctors.every((x) => x.isPathCard)
            ? "候选路径与差异（按院区能力，非具名医生）"
            : "候选路径与差异（基于公开信息）"}
        </h2>
        <div className="doctor-list">
          {d.matchedDoctors.map((doc) => {
            const diff = diffs.find((x) => x.doctorId === doc.id);
            return (
              <article key={doc.id} className="doctor-card">
                <div className="doctor-top">
                  <div>
                    <h3>{doc.name}</h3>
                    <p className="doctor-meta">
                      {doc.hospital} · {doc.department} · {doc.title}
                    </p>
                    <p className="doctor-meta">
                      院区：{HOSPITAL_CAMPUS_LABELS[doc.hospitalCampus]} · 角色：
                      {ROLE_LABEL[doc.serviceRole] || doc.serviceRole}
                    </p>
                  </div>
                  <span className={`match-badge match-${doc.matchLevel}`}>
                    {doc.isPathCard
                      ? "路径方向较匹配（待核验）"
                      : safeMatchWording(doc.matchLevel)}
                  </span>
                </div>
                <p>
                  <strong>公开信息显示：</strong>
                  {doc.evidence}
                </p>
                <p>
                  <strong>为什么匹配：</strong>
                  {doc.matchReasons.join("；")}
                </p>
                {diff && (
                  <div className="diff-box">
                    <p>
                      <strong>更适合：</strong>
                      {diff.betterFor}
                    </p>
                    <p>
                      <strong>不太适合：</strong>
                      {diff.lessSuitableFor}
                    </p>
                  </div>
                )}
                <div className="uncertain">
                  <strong>不确定性：</strong>
                  {doc.uncertainty}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 9. 不确定性 */}
      <section className="report-block">
        <h2>不确定性说明</h2>
        <ul>
          {s.uncertainties.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      {/* 10. 资料清单 */}
      <section className="report-block">
        <h2>带去医院的资料清单</h2>
        <ul>
          {s.materials.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      <details className="trace-box">
        <summary>决策可追溯（引擎痕迹）</summary>
        <pre>{JSON.stringify(d.engineTrace, null, 2)}</pre>
      </details>

      <div className="result-actions">
        <button type="button" className="btn btn-primary" onClick={copy}>
          复制可分享报告
        </button>
        <button type="button" className="btn btn-soft" onClick={() => window.print()}>
          打印 / PDF
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => nav("/replay")}>
          去案例回放补全结果
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            session.resetSession();
            nav("/");
          }}
        >
          再做一次
        </button>
      </div>
    </article>
  );
}
