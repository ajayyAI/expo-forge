import { translate } from "@/lib/i18n";

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

/**
 * Coarse "x ago" label for a session's `createdAt`. Buckets to just now / minutes
 * / hours / days; coarser than a full date library on purpose (no extra dep), and
 * pure so it can be tested against a fixed `now`.
 */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const seconds = Math.max(
    0,
    Math.round((now.getTime() - date.getTime()) / 1000)
  );

  if (seconds < MINUTE) {
    return translate("sessions.time.just_now");
  }
  if (seconds < HOUR) {
    const count = Math.floor(seconds / MINUTE);
    return translate("sessions.time.minutes_ago", { count });
  }
  if (seconds < DAY) {
    const count = Math.floor(seconds / HOUR);
    return translate("sessions.time.hours_ago", { count });
  }
  const count = Math.floor(seconds / DAY);
  return translate("sessions.time.days_ago", { count });
}
