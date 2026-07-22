import type { HospitalCampus } from "../../models/types";
import recent from "./recent.json";

export interface ScheduleSlot {
  date: string;
  period: string | number;
  status?: number;
  fee?: number;
  department?: string;
  sourceType?: string;
}

export interface DoctorScheduleSummary {
  slots: ScheduleSlot[];
  upcomingCount: number;
  nextDate: string | null;
}

export interface ScheduleCache {
  source: string;
  fetchedAt: string;
  windowDays: number;
  disclaimer: string;
  doctors: Record<string, DoctorScheduleSummary>;
  stats?: {
    facultyCount?: number;
    doctorCount?: number;
    slotCount?: number;
  };
}

const cache = recent as ScheduleCache;

/** status: 好大夫常见 3=有号/出诊展示，6=可能约满/停相关，仅作弱信号 */
function isLikelyBookable(status: number | undefined): boolean {
  if (status == null) return true;
  return status === 3 || status === 1 || status === 2;
}

export function getScheduleCacheMeta() {
  return {
    source: cache.source,
    fetchedAt: cache.fetchedAt,
    windowDays: cache.windowDays,
    disclaimer: cache.disclaimer,
    stats: cache.stats,
  };
}

export function getDoctorSchedule(doctorId: string): DoctorScheduleSummary | undefined {
  return cache.doctors?.[doctorId];
}

/** 近窗是否有出诊（不承诺号源） */
export function hasUpcomingSlot(doctorId: string): boolean {
  const s = getDoctorSchedule(doctorId);
  return Boolean(s && s.upcomingCount > 0);
}

export function upcomingBookableCount(doctorId: string): number {
  const s = getDoctorSchedule(doctorId);
  if (!s) return 0;
  return s.slots.filter((x) => isLikelyBookable(x.status)).length;
}

export function scheduleBoost(doctorId: string): {
  boost: number;
  reason?: string;
} {
  const s = getDoctorSchedule(doctorId);
  if (!s || s.upcomingCount <= 0) {
    return { boost: 0 };
  }
  const bookable = upcomingBookableCount(doctorId);
  if (bookable >= 3) {
    return {
      boost: 5,
      reason: `近${cache.windowDays}日公开出诊较多（约 ${bookable} 个时段），行程可落地性更高`,
    };
  }
  if (bookable >= 1 || s.upcomingCount >= 1) {
    return {
      boost: 3,
      reason: `近窗公开出诊可参考（下次约 ${s.nextDate || "近期"}），仍以官方号源为准`,
    };
  }
  return { boost: 1, reason: "近窗有出诊记录，号源状态待核验" };
}

export function scheduleBoostForDoctor(doc: {
  id: string;
  haodfDoctorId?: string;
  hospitalCampus?: HospitalCampus;
}): {
  boost: number;
  reason?: string;
} {
  const ids = [doc.id];
  if (doc.haodfDoctorId && doc.hospitalCampus) {
    const prefix = doc.hospitalCampus === "xiangya" ? "xy" : "xy2";
    ids.push(`${prefix}_hdf_${doc.haodfDoctorId}`);
  }
  for (const id of ids) {
    const result = scheduleBoost(id);
    if (result.boost > 0) return result;
  }
  return { boost: 0 };
}
