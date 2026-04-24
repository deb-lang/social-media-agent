// Scheduler — picks the next Tuesday 9 AM PST or Thursday 10 AM PST slot,
// skipping past dates and US federal holidays. Called at approval time so
// late-approved posts always get a future slot.

import { addDays, setHours, setMinutes, setSeconds, setMilliseconds, isBefore, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { US_HOLIDAYS_2026, SCHEDULE_CONFIG } from "./constants";

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
