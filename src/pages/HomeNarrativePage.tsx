import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MEDICAL_DISCLAIMER } from "../safety/medicalBoundary";
import { useSession } from "../state/SessionProvider";
import { useRepos } from "../state/RepoProvider";
import { runFastRecommend } from "../services/fastRecommendPipeline";

const SHORTCUTS = [
  {
    id: "sleep",
    label: "失眠焦虑找医生",
    text: "长沙失眠焦虑挂哪个医生？",
  },
  {
    id: "nodule",
    label: "肺结节手术评估",
    text: "体检发现肺结节，想找擅长手术评估的医生。",
  },
  {
    id: "stroke",
    label: "突发头晕手麻",
    text: "我爸突然说话含糊右手没劲。",
  },
  {
    id: "cbt",
    label: "想做心理咨询/CBT",
    text: "抑郁相关，想做认知行为心理咨询，长沙附二挂谁？",
  },
];

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

export function HomeNarrativePage() {
  const nav = useNavigate();
  const session = useSession();
  const { doctors } = useRepos();
  const [text, setText] = useState(session.narrative);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);

  const runRecommend = useCallback(
    async (input: string) => {
      let narrative = input.trim();
      if (narrative.length < 4) {
        alert("请用一句话说明你想解决的问题。");
        return;
      }
      // 补充条件（如「最好是女医生」）自动拼到上次诉求，避免结果不变/丢上下文
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
      const pool = await doctors.listAll();
      const result = runFastRecommend({ text: narrative, doctors: pool });
      session.setNarrative(narrative);
      session.setFastResult(result);
      session.setPendingFollowUps(result.followUps);
      session.setRankingBias({});
      session.setDecision(null);
      setBusy(false);
      nav("/recommend");
    },
    [doctors, nav, session]
  );

  const onVoice = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      alert("当前浏览器暂不支持语音输入，请直接打字。");
      return;
    }
    const rec = new SR();
    rec.lang = "zh-CN";
    rec.interimResults = false;
    setListening(true);
    rec.onresult = (ev) => {
      const said = ev.results[0]?.[0]?.transcript || "";
      setText((prev) => (prev ? `${prev}${said}` : said));
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  return (
    <section className="home-fast">
      <div className="home-hero home-hero-compact">
        <p className="eyebrow">医策 · 湘雅 / 附二</p>
        <h1 className="brand-hero">医策</h1>
        <p className="home-lead">
          一句话匹配医院 + 科室 + 医生。最少追问，先给可执行推荐。
        </p>
      </div>

      <div className="fast-panel">
        <label className="narrative-label" htmlFor="one-liner">
          请用一句话描述你想解决的问题，我会直接帮你匹配医生。
        </label>
        <div className="fast-input-row">
          <textarea
            id="one-liner"
            className="narrative-input fast-input"
            placeholder="例如：我最近失眠焦虑，长沙挂哪个医生？"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void runRecommend(text);
              }
            }}
          />
          <button
            type="button"
            className={`btn btn-soft voice-btn ${listening ? "listening" : ""}`}
            onClick={onVoice}
            aria-label="语音输入"
            title="语音输入"
          >
            {listening ? "聆听中" : "语音"}
          </button>
        </div>

        <div className="shortcut-grid" aria-label="高频入口">
          {SHORTCUTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="shortcut-chip"
              onClick={() => {
                setText(s.text);
                void runRecommend(s.text);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="narrative-footer">
          <p className="tiny-disclaimer">{MEDICAL_DISCLAIMER}</p>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={busy}
            onClick={() => void runRecommend(text)}
          >
            {busy ? "匹配中…" : "立即匹配医生"}
          </button>
        </div>
      </div>
    </section>
  );
}
