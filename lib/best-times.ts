// Pure function pickBestSlot: takes Publer's best-times heatmap +
// already-scheduled-for timestamps + a curated fallback, returns the next
// best future ISO slot in the PT working window.
//
// No I/O. Tested by passing in fixture heatmaps. Caller (lib/scheduler.ts)
// fetches the Publer heatmap and hands it in.
//
// TIMEZONE NOTE: Publer keys the heatmap by day-of-week in the workspace's
// timezone (Asia/Manila for our prod workspace). The scores within each
// 24-element array are also in workspace-local hours, NOT UTC. We convert
// (workspaceDayName, workspaceHour) → an absolute candidate Date by
// interpreting them in the workspace TZ, then re-projecting to PT to
// apply the working-hours filter (7-18 PT) and weekend/holiday filters.

import { addDays, isBefore, setHours, setMinutes, setSeconds, setMilliseconds, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  CURATED_BEST_TIMES_B2B_LINKEDIN,
  US_HOLIDAYS_2026,
  SCHEDULE_CONFIG,
} from "./constants";
import type { BestTimesHeatmap, DayName } from "./publer";

const DAY_NAMES: DayName[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const WORKSPACE_TIMEZONE = "Asia/Manila"; // Publer workspace TZ (see lib/publer.ts comments)
const POST_TIMEZONE = SCHEDULE_CONFIG.timezone; // "America/Los_Angeles"

const WORKING_WINDOW_START = 7;  // 7 AM PT inclusive
const WORKING_WINDOW_END = 18;   // 6 PM PT inclusive (post must fire at or before)
const MIN_FUTURE_MS = 5 * 60_000;
const MIN_NONZERO_FOR_TRUSTWORTHY = 10;
const SEARCH_WINDOW_DAYS = 14;

export interface BestSlotInput {
  heatmap?: BestTimesHeatmap | null;
  excludeIsoSlots?: Set<string>;
  now?: Date;
}

function isHoliday(date: Date): boolean {
  const ptDate = toZonedTime(date, POST_TIMEZONE);
  const dateStr = format(ptDate, "yyyy-MM-dd");
  return US_HOLIDAYS_2026.includes(dateStr);
}

/**
 * Build an ISO timestamp for a candidate (dayOfWeek, hour) interpreted in
 * POST_TIMEZONE (PT). The result is the next future occurrence at or after
 * `now + MIN_FUTURE_MS`, within `SEARCH_WINDOW_DAYS`. Returns null if no
 * future occurrence exists in the window.
 */
function nextOccurrencePT(
  ptDayOfWeek: number, // 0..6 Sun..Sat
  ptHour: number,      // 0..23 PT
  now: Date
): Date | null {
  const minFuture = new Date(now.getTime() + MIN_FUTURE_MS);
  let candidatePT = toZonedTime(now, POST_TIMEZONE);
  for (let i = 0; i <= SEARCH_WINDOW_DAYS; i++) {
    if (candidatePT.getDay() === ptDayOfWeek) {
      const slotPT = setMilliseconds(setSeconds(setMinutes(setHours(candidatePT, ptHour), 0), 0), 0);
      const slotUtc = fromZonedTime(slotPT, POST_TIMEZONE);
      if (!isBefore(slotUtc, minFuture)) {
        return slotUtc;
      }
    }
    candidatePT = addDays(candidatePT, 1);
  }
  return null;
}

interface RankedCandidate {
  ptDayOfWeek: number;
  ptHour: number;
  score: number;     // for sort (curated entries use position-based score)
  source: "publer" | "curated";
}

/**
 * Flatten a Publer heatmap into ranked candidates, projected from the
 * workspace TZ to PT. Hours that fall outside the PT working window are
 * dropped. Weekends are dropped.
 */
function rankPublerCandidates(heatmap: BestTimesHeatmap, now: Date): RankedCandidate[] {
  const candidates: RankedCandidate[] = [];

  // Pick a fixed reference date — first occurrence of each day-of-week from
  // `now`, so the workspace-TZ → PT projection is concrete.
  const baseWorkspace = toZonedTime(now, WORKSPACE_TIMEZONE);

  for (let i = 0; i < DAY_NAMES.length; i++) {
    const dayName = DAY_NAMES[i];
    const scores = heatmap[dayName];
    if (!scores || scores.length !== 24) continue;

    // Find next occurrence of this workspace day-of-week
    let workspaceDayDate = baseWorkspace;
    for (let step = 0; step < 7; step++) {
      if (workspaceDayDate.getDay() === i) break;
      workspaceDayDate = addDays(workspaceDayDate, 1);
    }

    for (let h = 0; h < 24; h++) {
      const score = scores[h];
      if (score <= 0) continue;

      // Interpret workspace day+hour as a concrete Date in workspace TZ,
      // then re-derive PT day+hour.
      const inWorkspaceLocal = setMilliseconds(setSeconds(setMinutes(setHours(workspaceDayDate, h), 0), 0), 0);
      const utc = fromZonedTime(inWorkspaceLocal, WORKSPACE_TIMEZONE);
      const inPT = toZonedTime(utc, POST_TIMEZONE);
      const ptDayOfWeek = inPT.getDay();
      const ptHour = inPT.getHours();

      // Working window + weekend filter
      if (ptDayOfWeek === 0 || ptDayOfWeek === 6) continue;
      if (ptHour < WORKING_WINDOW_START || ptHour > WORKING_WINDOW_END) continue;

      candidates.push({ ptDayOfWeek, ptHour, score, source: "publer" });
    }
  }

  // Sort by score DESC
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function isHeatmapTrustworthy(heatmap: BestTimesHeatmap | null | undefined): boolean {
  if (!heatmap) return false;
  let nonZero = 0;
  for (const day of DAY_NAMES) {
    const arr = heatmap[day];
    if (!arr) continue;
    for (const v of arr) if (v > 0) nonZero++;
  }
  return nonZero >= MIN_NONZERO_FOR_TRUSTWORTHY;
}

/**
 * Pick the next best future ISO slot. Throws if no candidate clears every
 * filter (caller catches and falls through to legacy getNextSlot).
 */
export function pickBestSlot(opts: BestSlotInput): { iso: string; source: "publer" | "curated" } {
  const now = opts.now ?? new Date();
  const excluded = opts.excludeIsoSlots ?? new Set<string>();

  const ranked: RankedCandidate[] = isHeatmapTrustworthy(opts.heatmap)
    ? rankPublerCandidates(opts.heatmap as BestTimesHeatmap, now)
    : [];

  // Always append the curated fallback after Publer entries — provides
  // a baseline if Publer ranking + filters thin it out.
  const curatedRanked: RankedCandidate[] = CURATED_BEST_TIMES_B2B_LINKEDIN.map((c, idx) => ({
    ptDayOfWeek: c.day,
    ptHour: c.hour,
    score: CURATED_BEST_TIMES_B2B_LINKEDIN.length - idx, // earlier = higher score
    source: "curated" as const,
  }));

  const allCandidates = [...ranked, ...curatedRanked];

  for (const c of allCandidates) {
    const slot = nextOccurrencePT(c.ptDayOfWeek, c.ptHour, now);
    if (!slot) continue;
    const iso = slot.toISOString();
    if (excluded.has(iso)) continue;
    if (isHoliday(slot)) continue;
    return { iso, source: c.source };
  }

  throw new Error(
    `pickBestSlot: exhausted ${allCandidates.length} candidates within ${SEARCH_WINDOW_DAYS}d window (all in exclude set or holidays)`
  );
}
