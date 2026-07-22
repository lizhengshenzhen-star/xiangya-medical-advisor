import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MEDICAL_DISCLAIMER } from "../safety/medicalBoundary";
import { useSession } from "../state/SessionProvider";
import { useRepos } from "../state/RepoProvider";
import { runFastRecommend } from "../services/fastRecommendPipeline";

export function RecommendPage() {
  const nav = useNavigate();
  const session = useSession();
  const { doctors } = useRepos();
  const [busy, setBusy] = useState(false);
  const result = session.fastResult;
  const q = session.pendingFollowUps[0];

  if (!result) {
    return (
      <div className="panel">
        <p>还没有推荐结果，请先输入一句话。</p>
        <button className="btn btn-primary" onClick={() => nav("/")}>
          返回
        </button>
      </div>
    );
  }

  const primary = result.candidates[0];
  const alt = result.candidates[1];

  const applyFollowUp = async (optionId: string) => {
    if (!q) return;
    const opt = q.options.find((o) => o.id === optionId);
    if (!opt) return;
    setBusy(true);
    const bias = { ...session.rankingBias, ...opt.biasPatch };
    session.setRankingBias(bias);
    const pool = await doctors.listAll();
    const next = runFastRecommend({
      text: session.narrative,
      doctors: pool,
      rankingBias: bias,
    });
    // 答完一题后清空追问（最多 0-2，产品上先推后问，答 1 个即可收敛）
    session.setFastResult({ ...next, followUps: next.followUps.slice(1) });
    session.setPendingFollowUps([]);
    setBusy(false);
  };

  const copyCard = async () => {
    await navigator.clipboard.writeText(result.primaryCardMarkdown);
    alert("推荐卡已复制");
  };

  return (
    <article className="recommend-page panel">
      {result.isEmergency && (
        <div className="risk-banner emergency-banner">
          高危信号：请优先急诊，不要等待普通门诊号源。
        </div>
      )}

      <p className="eyebrow">初步匹配（先推荐，再必要时追问）</p>
      <h1 className="recommend-title">推荐结果</h1>
      <p className="muted">
        场景：{result.intent.diseaseScenario} · 紧急程度：
        {primary?.urgencyLabel}
        {result.intent.dualPaths
          ? ` · 双路径：${result.intent.dualPaths.join(" + ")}`
          : ""}
      </p>

      <section className="rec-card primary-rec">
        <p className="rec-kicker">优先医生方向</p>
        <h2>
          {primary?.hospital}
          <span className="rec-dept"> · {primary?.department}</span>
        </h2>
        <p className="rec-type">医生类型：{primary?.doctorType}</p>
        {primary?.namedDoctors && primary.namedDoctors.length > 0 && (
          <p className="rec-doctors">
            可参考：
            {primary.namedDoctors
              .map((d) => `${d.name}（${d.title}）`)
              .join("、")}
          </p>
        )}
        <h3>为什么推荐</h3>
        <ul>
          {(primary?.reasons || []).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <h3>为什么不是另一个常见选择</h3>
        <p>{primary?.whyNotAlternative}</p>
        <div className="rec-meta-row">
          <span>建议挂号：{primary?.bookingHint}</span>
          <span>紧急程度：{primary?.urgencyLabel}</span>
        </div>
      </section>

      {alt && !result.isEmergency && (
        <section className="rec-card alt-rec">
          <p className="rec-kicker">备选推荐</p>
          <h2>
            {alt.hospital}
            <span className="rec-dept"> · {alt.department}</span>
          </h2>
          <p className="rec-type">医生类型：{alt.doctorType}</p>
          <p className="muted">适合：{alt.suitedFor}</p>
        </section>
      )}

      {q && !result.isEmergency && (
        <section className="rec-followup">
          <h3>我只再确认一个问题</h3>
          <p className="lead">{q.prompt}</p>
          <p className="muted">{q.why}</p>
          <div className="option-list">
            {q.options.map((o) => (
              <button
                key={o.id}
                type="button"
                className="btn btn-soft option-btn"
                disabled={busy}
                onClick={() => void applyFollowUp(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="tiny-disclaimer">{MEDICAL_DISCLAIMER}</p>

      <div className="report-actions">
        <button type="button" className="btn btn-primary" onClick={() => void copyCard()}>
          复制推荐卡
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => nav("/")}>
          再匹配一次
        </button>
      </div>
    </article>
  );
}
