import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { mapFastResultToDecision } from "../../features/doctor-decision/mapFastResultToDecision";
import { MEDICAL_DISCLAIMER } from "../../safety/medicalBoundary";
import { createConsultFromMatch } from "../../services/consultService";
import { runFastRecommend } from "../../services/fastRecommendPipeline";
import { useCurrentUser } from "../../state/CurrentUserProvider";
import { useRepos } from "../../state/RepoProvider";
import { useSession } from "../../state/SessionProvider";

const SHORTCUTS = [
  {
    id: "cbt",
    label: "抑郁 + CBT 心理咨询",
    text: "35岁女性，半年情绪低落，经常失眠，希望找心理咨询医生，最好懂认知行为治疗CBT。",
  },
  {
    id: "sleep",
    label: "失眠焦虑",
    text: "患者近一个月失眠焦虑加重，想在长沙挂精神心理相关医生。",
  },
  {
    id: "nodule",
    label: "肺结节手术评估",
    text: "体检发现肺结节，想找擅长手术评估的医生。",
  },
  {
    id: "female",
    label: "女医生 + 心理咨询",
    text: "想找心理咨询师，擅长抑郁症和认知行为，最好是女医生。",
  },
];

export function MatchPage() {
  const nav = useNavigate();
  const session = useSession();
  const { doctors, consults, users, analytics } = useRepos();
  const { user, refresh } = useCurrentUser();
  const [text, setText] = useState(session.narrative);
  const [busy, setBusy] = useState(false);

  const runRecommend = useCallback(
    async (input: string) => {
      let narrative = input.trim();
      if (narrative.length < 8) {
        alert("请尽量完整描述患者情况（症状、偏好、目标）。");
        return;
      }
      if (!user) {
        alert("请先选择当前用户身份。");
        return;
      }
      const prev = session.narrative.trim();
      if (
        prev &&
        narrative !== prev &&
        !narrative.includes(prev.slice(0, Math.min(12, prev.length))) &&
        narrative.length <= 40
      ) {
        narrative = `${prev}；${narrative}`;
        setText(narrative);
      }

      setBusy(true);
      await analytics.track({ type: "consult_started", userId: user.id });
      const pool = await doctors.listAll();
      const result = runFastRecommend({ text: narrative, doctors: pool });
      const decision = mapFastResultToDecision(result, pool);
      const record = await createConsultFromMatch({
        user,
        inputText: narrative,
        fastResult: result,
        decision,
        consults,
        users,
        analytics,
      });
      session.setNarrative(narrative);
      session.setFastResult(result);
      session.setPendingFollowUps(result.followUps);
      session.setRankingBias({});
      await refresh();
      setBusy(false);
      nav(`/app/result/${record.id}`);
    },
    [analytics, consults, doctors, nav, refresh, session, user, users],
  );

  return (
    <div className="decision-root mx-auto max-w-[720px] space-y-4 p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-medical-600">
          步骤 1 · 录入
        </p>
        <h1 className="text-2xl font-bold">输入患者情况</h1>
        <p className="mt-1 text-sm text-slate-600">
          面向陪诊师/挂号顾问：描述症状、治疗偏好与约束，AI 将生成画像与医生匹配。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">患者情况</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-900"
            rows={6}
            placeholder="例如：35岁女性，半年情绪低落，经常失眠，希望找心理咨询医生，最好懂认知行为治疗CBT。"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {SHORTCUTS.map((s) => (
              <Button
                key={s.id}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setText(s.text);
                  void runRecommend(s.text);
                }}
              >
                {s.label}
              </Button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">{MEDICAL_DISCLAIMER}</p>
          <Button
            size="lg"
            className="w-full"
            disabled={busy}
            onClick={() => void runRecommend(text)}
          >
            {busy ? "AI 分析匹配中…" : "生成 AI 推荐"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
