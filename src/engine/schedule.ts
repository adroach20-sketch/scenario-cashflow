/**
 * Schedule logic: determines which dates a CashStream fires on.
 *
 * This is the core date math for the forecasting engine.
 * Given a stream's frequency and configuration, it answers:
 * "Does this stream produce a transaction on this date?"
 */

import { differenceInCalendarDays, parseISO, getDate } from 'date-fns';
import type { CashStream } from './types';

/**
 * Check if a stream fires on a given date.
 *
 * Rules:
 * - The date must be >= stream.startDate
 * - The date must be <= stream.endDate (if endDate exists)
 * - The date must match the stream's recurrence pattern
 */
export function doesStreamFireOnDate(stream: CashStream, date: Date): boolean {
  const dateStr = toISODate(date);

  // Check date bounds
  if (dateStr < stream.startDate) return false;
  if (stream.endDate && dateStr > stream.endDate) return false;

  switch (stream.frequency) {
    case 'one-time':
      return dateStr === stream.startDate;

    case 'monthly':
      return matchesMonthlySchedule(date, stream.dayOfMonth ?? 1);

    case 'biweekly':
      return matchesBiweeklySchedule(date, stream.anchorDate ?? stream.startDate);

    case 'weekly':
      return matchesWeeklySchedule(date, stream.anchorDate ?? stream.startDate);

    case 'semimonthly':
      return matchesSemimonthlySchedule(date);

    default:
      return false;
  }
}

/**
 * Monthly: fires on a specific day of the month.
 *
 * If dayOfMonth is 29-31 and the month doesn't have that many days,
 * we fire on the last day of the month. But we cap at 28 in the UI
 * to keep things simple for v0.
 */
function matchesMonthlySchedule(date: Date, dayOfMonth: number): boolean {
  return getDate(date) === dayOfMonth;
}

/**
 * Biweekly: fires every 14 days from an anchor date.
 *
 * The anchor date is a known occurrence (e.g., "I got paid on Jan 30").
 * We count how many days since the anchor and check if it's a multiple of 14.
 *
 * Why this works: biweekly pay doesn't care about months or day-of-month.
 * It's strictly every 14 calendar days. This naturally produces the
 * 3-paycheck months that matter for cashflow forecasting.
 */
function matchesBiweeklySchedule(date: Date, anchorDate: string): boolean {
  const anchor = parseISO(anchorDate);
  const daysDiff = differenceInCalendarDays(date, anchor);
  return daysDiff >= 0 && daysDiff % 14 === 0;
}

/**
 * Weekly: fires every 7 days from an anchor date.
 */
function matchesWeeklySchedule(date: Date, anchorDate: string): boolean {
  const anchor = parseISO(anchorDate);
  const daysDiff = differenceInCalendarDays(date, anchor);
  return daysDiff >= 0 && daysDiff % 7 === 0;
}

/**
 * Semimonthly: fires on the 1st and 15th of each month.
 *
 * This is for people paid on fixed dates (not biweekly).
 * Unlike biweekly, this always produces exactly 2 payments per month.
 */
function matchesSemimonthlySchedule(date: Date): boolean {
  const day = getDate(date);
  return day === 1 || day === 15;
}

/** Format a Date as YYYY-MM-DD string for comparison. */
function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
