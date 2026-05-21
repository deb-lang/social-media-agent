// Scheduler.
//
// Primary path (2026-05): getNextBestSlot uses Publer's /best_times heatmap
// + a curated B2B LinkedIn fallback to auto-pick the next high-engagement
// slot at approval time. See lib/best-times.ts.
//
// Legacy fallback: getNextSlot picks Tue 9 AM PT or Thu 10 AM PT.
// Kept as tertiary fallback inside getNextBestSlot and as the placeholder
// scheduler the bi-monthly /api/generate cron uses (Approve recomputes
// scheduled_for anyway).

import { addDays, setHours, setMinutes, setSeconds, setMilliseconds, isBefore, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { US_HOLIDAYS_2026, SCHEDULE_CONFIG } from "./constants";
import { pickBestSlot } from "./best-times";
import { getBestTimes } from "./publer";

type PreferredDay = "tue" | "thu";
const DAY_NUMBER: Record<PreferredDay, number> = { tue: 2, thu: 4 };

function isHoliday(date: Date): boolean {
  const pstDate = toZonedTime(date, SCHEDULE_CONFIG.timezone);
  const dateStr = format(pstDate, "yyyy-MM-dd");
  return US_HOLIDAYS_2026.includes(dateStr);
}

export function getNextSlot(preferredDay: PreferredDay, now: Date = new Date()): string {
  const hour = preferredDay === "tue" ? SCHEDULE_CONFIG.tuesdayHour : SCHEDULE_CONFIG.thursdayHour;
  const targetDay = DAY_NUMBER[preferredDay];

  let candidate = toZonedTime(now, SCHEDULE_CONFIG.timezone);

  for (let i = 0; i < 30; i++) {
    if (candidate.getDay() === targetDay) {
      // Set to target hour in PST
      let slot = setMilliseconds(setSeconds(setMinutes(setHours(candidate, hour), 0), 0), 0);
      slot = fromZonedTime(slot, SCHEDULE_CONFIG.timezone);
      // Must be in the future by at least 5 minutes, and not a holiday
      const minFuture = new Date(now.getTime() + 5 * 60 * 1000);
      if (!isBefore(slot, minFuture) && !isHoliday(slot)) {
        return slot.toISOString();
      }
    }
    candidate = addDays(candidate, 1);
  }

  throw new Error(`Could not find a ${preferredDay} slot within 30 days of ${now.toISOString()}`);
}

export function getNextTwoSlots(now: Date = new Date()): { tuesday: string; thursday: string } {
  return {
    tuesday: getNextSlot("tue", now),
    thursday: getNextSlot("thu", now),
  };
}

// ─── Smart auto-scheduler ────────────────────────────────────
// getNextBestSlot — fetch Publer's best_times heatmap, pick the highest-
// scoring future slot in the PT working window that's not already taken
// or on a holiday. Falls back to the curated B2B list, and ultimately to
// getNextSlot("tue") if every layer fails.
//
// Returns { iso, source } so the caller can log which path was used.

export interface NextBestSlotOpts {
  accountId: string;            // Publer LinkedIn account id
  excludeIsoSlots?: Set<string>;
  now?: Date;
}

export async function getNextBestSlot(
  opts: NextBestSlotOpts
): Promise<{ iso: string; source: "publer" | "curated" | "legacy-fixed" }> {
  const now = opts.now ?? new Date();

  // 1) Try to fetch Publer's heatmap for the last 30 days. Failure is
  // non-fatal — we'll fall through to curated.
  let heatmap = null;
  try {
    const from = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);
    heatmap = await getBestTimes({ accountId: opts.accountId, from, to });
  } catch (err) {
    console.warn(`[scheduler] getBestTimes failed (non-fatal):`, err);
  }

  // 2) Hand off to the pure picker.
  try {
    const { iso, source } = pickBestSlot({
      heatmap,
      excludeIsoSlots: opts.excludeIsoSlots,
      now,
    });
    return { iso, source };
  } catch (err) {
    console.warn(`[scheduler] pickBestSlot exhausted candidates — falling back to legacy fixed slot:`, err);
  }

  // 3) Ultimate fallback so Approve never fails on scheduling.
  return { iso: getNextSlot("tue", now), source: "legacy-fixed" };
}
