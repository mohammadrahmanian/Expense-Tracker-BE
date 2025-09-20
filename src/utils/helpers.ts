import { RecurrenceFrequency } from "@prisma/client";
import { isAmong } from "tsafe";

/**
 * Calculate the next occurrence date based on the recurrence frequency.
 * @param recurrenceFrequency RecurrenceFrequency
 * @param startDate The start date of the recurrence
 * @param currentOccurrence The current occurrence date
 * @returns The next occurrence date
 */
export const calculateNextOccurrence = (
  recurrenceFrequency: RecurrenceFrequency,
  startDate: Date,
  currentOccurrence: Date
) => {
  if (!isAmong(Object.values(RecurrenceFrequency), recurrenceFrequency)) {
    return null;
  }

  // Create copy of the start date to avoid mutating the original start date
  const _startDate = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    )
  );
  const _currentOccurrence = new Date(
    Date.UTC(
      currentOccurrence.getUTCFullYear(),
      currentOccurrence.getUTCMonth(),
      currentOccurrence.getUTCDate()
    )
  );
  const nextOccurrence = new Date(
    Date.UTC(
      currentOccurrence.getUTCFullYear(),
      currentOccurrence.getUTCMonth(),
      currentOccurrence.getUTCDate()
    )
  );

  // Set the time to the beginning of the day for consistency
  nextOccurrence.setUTCHours(0, 0, 0, 0);
  _startDate.setUTCHours(0, 0, 0, 0);
  _currentOccurrence.setUTCHours(0, 0, 0, 0);
  switch (recurrenceFrequency) {
    case "DAILY":
      nextOccurrence.setUTCDate(_currentOccurrence.getUTCDate() + 1);
      break;
    case "WEEKLY":
      nextOccurrence.setUTCDate(_currentOccurrence.getUTCDate() + 7);
      break;
    case "MONTHLY":
      nextOccurrence.setUTCMonth(_currentOccurrence.getUTCMonth() + 1);

      // Handle month overflow (e.g., Jan 31 + 1 month = Mar 3)
      if (nextOccurrence.getUTCMonth() - _currentOccurrence.getUTCMonth() > 1) {
        nextOccurrence.setUTCDate(0); // Set to last day of previous month
      } else {
        nextOccurrence.setUTCDate(_startDate.getUTCDate());
      }
      break;
    case "YEARLY":
      nextOccurrence.setUTCFullYear(_currentOccurrence.getUTCFullYear() + 1);
      
      // Handle Leap year overflow for the next occurrence
      if (nextOccurrence.getUTCMonth() - _currentOccurrence.getUTCMonth() > 0) {
        nextOccurrence.setUTCDate(0); // Set to last day of previous month
      } else {
        nextOccurrence.setUTCDate(_startDate.getUTCDate());
        // If the month has changed, it means we overflowed (e.g., Feb 29 to Mar 1) happens to Feb 29 in leap years
        if (nextOccurrence.getUTCMonth() !== _startDate.getUTCMonth()) {
          nextOccurrence.setUTCDate(0); // Set to last day of previous month
        }
      }

      break;
  }

  return nextOccurrence;
};
