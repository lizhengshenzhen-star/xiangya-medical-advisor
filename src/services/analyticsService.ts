import type { ConsultRecord, FeedbackRating } from "../models/companion";
import { FEEDBACK_RATING_LABELS } from "../models/companion";

export interface DashboardStats {
  totalConsults: number;
  todayConsults: number;
  activeUsers: number;
  diseaseBreakdown: Array<{ label: string; count: number }>;
  topDoctors: Array<{ name: string; count: number }>;
  satisfaction: Array<{ label: string; count: number; pct: number }>;
  feedbackRate: number;
  hotQueries: Array<{ text: string; count: number }>;
}

function isSameDay(iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function aggregateDashboard(consults: ConsultRecord[]): DashboardStats {
  const totalConsults = consults.length;
  const todayConsults = consults.filter((c) => isSameDay(c.createdAt)).length;
  const activeUsers = new Set(consults.map((c) => c.userId)).size;

  const diseaseMap = new Map<string, number>();
  const doctorMap = new Map<string, number>();
  const queryMap = new Map<string, number>();
  const ratingMap = new Map<FeedbackRating, number>();

  for (const c of consults) {
    const dir = c.patientProfile.diseaseDirection || "未分类";
    diseaseMap.set(dir, (diseaseMap.get(dir) || 0) + 1);
    for (const r of c.recommendations) {
      doctorMap.set(r.name, (doctorMap.get(r.name) || 0) + 1);
    }
    const q = c.inputText.slice(0, 36);
    queryMap.set(q, (queryMap.get(q) || 0) + 1);
    if (c.feedback) {
      ratingMap.set(c.feedback.rating, (ratingMap.get(c.feedback.rating) || 0) + 1);
    }
  }

  const withFeedback = consults.filter((c) => c.feedback).length;
  const satisfaction = (["accurate", "mostly", "miss"] as FeedbackRating[]).map((r) => {
    const count = ratingMap.get(r) || 0;
    return {
      label: FEEDBACK_RATING_LABELS[r],
      count,
      pct: withFeedback ? Math.round((count / withFeedback) * 100) : 0,
    };
  });

  const sortCount = (a: [string, number], b: [string, number]) => b[1] - a[1];

  return {
    totalConsults,
    todayConsults,
    activeUsers,
    diseaseBreakdown: [...diseaseMap.entries()]
      .sort(sortCount)
      .slice(0, 8)
      .map(([label, count]) => ({ label, count })),
    topDoctors: [...doctorMap.entries()]
      .sort(sortCount)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count })),
    satisfaction,
    feedbackRate: totalConsults ? Math.round((withFeedback / totalConsults) * 100) : 0,
    hotQueries: [...queryMap.entries()]
      .sort(sortCount)
      .slice(0, 6)
      .map(([text, count]) => ({ text, count })),
  };
}
