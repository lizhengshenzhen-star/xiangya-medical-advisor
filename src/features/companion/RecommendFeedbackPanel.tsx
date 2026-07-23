import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  FEEDBACK_MISS_LABELS,
  FEEDBACK_RATING_LABELS,
  type FeedbackMissReason,
  type FeedbackRating,
  type RecommendFeedback,
} from "../../models/companion";

const RATINGS: FeedbackRating[] = ["accurate", "mostly", "miss"];
const MISS_REASONS = Object.keys(FEEDBACK_MISS_LABELS) as FeedbackMissReason[];

export function RecommendFeedbackPanel({
  existing,
  onSubmit,
}: {
  existing?: RecommendFeedback;
  onSubmit: (payload: {
    rating: FeedbackRating;
    missReasons?: FeedbackMissReason[];
    comment?: string;
  }) => Promise<void> | void;
}) {
  const [rating, setRating] = useState<FeedbackRating | null>(existing?.rating ?? null);
  const [reasons, setReasons] = useState<FeedbackMissReason[]>(existing?.missReasons ?? []);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const locked = Boolean(existing);

  const toggleReason = (r: FeedbackMissReason) => {
    setReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const submit = async () => {
    if (!rating || locked) return;
    if (rating === "miss" && reasons.length === 0) {
      alert("请选择不符合预期的原因");
      return;
    }
    setBusy(true);
    await onSubmit({
      rating,
      missReasons: rating === "miss" ? reasons : undefined,
      comment: comment.trim() || undefined,
    });
    setBusy(false);
  };

  return (
    <Card className="border-amber-200/80 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
          推荐质量反馈
        </p>
        <CardTitle className="text-[15px]">本次推荐是否准确？</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {RATINGS.map((r) => (
            <Button
              key={r}
              type="button"
              size="sm"
              variant={rating === r ? "default" : "outline"}
              disabled={locked}
              onClick={() => setRating(r)}
            >
              {FEEDBACK_RATING_LABELS[r]}
            </Button>
          ))}
        </div>

        {rating === "miss" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-300">请选择原因（可多选）</p>
            <div className="flex flex-wrap gap-2">
              {MISS_REASONS.map((r) => (
                <button key={r} type="button" disabled={locked} onClick={() => toggleReason(r)}>
                  <Badge variant={reasons.includes(r) ? "default" : "outline"}>
                    {FEEDBACK_MISS_LABELS[r]}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          rows={2}
          placeholder="补充说明（可选）"
          value={comment}
          disabled={locked}
          onChange={(e) => setComment(e.target.value)}
        />

        {locked ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-300">反馈已提交，感谢协助优化 AI。</p>
        ) : (
          <Button className="w-full" disabled={!rating || busy} onClick={() => void submit()}>
            {busy ? "提交中…" : "提交反馈"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
