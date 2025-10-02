import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { calculateNextOccurrenceOnce, calculateNextOccurrence } from "./helpers";

describe("calculateNextOccurrenceOnce", () => {
  describe("DAILY", () => {
    test("should add one day to current occurrence", () => {
      const startDate = new Date("2024-01-01");
      const currentOccurrence = new Date("2024-01-10");
      const result = calculateNextOccurrenceOnce(
        "DAILY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-01-11");
    });

    test("Month boundary transition", () => {
      const startDate = new Date("2024-01-31");
      const currentOccurrence = new Date("2024-01-31");
      const result = calculateNextOccurrenceOnce(
        "DAILY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-02-01");
    });

    test("Year boundary transition", () => {
      const startDate = new Date("2023-12-31");
      const currentOccurrence = new Date("2023-12-31");
      const result = calculateNextOccurrenceOnce(
        "DAILY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-01-01");
    });

    test("Leap year Feb 28 → Feb 29", () => {
      const startDate = new Date("2024-02-28");
      const currentOccurrence = new Date("2024-02-28");
      const result = calculateNextOccurrenceOnce(
        "DAILY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-02-29");
    });

    test("Non-leap year Feb 28 → Mar 1", () => {
      const startDate = new Date("2023-02-28");
      const currentOccurrence = new Date("2023-02-28");
      const result = calculateNextOccurrenceOnce(
        "DAILY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2023-03-01");
    });

    test("Time component handling - should normalize to UTC midnight", () => {
      const startDate = new Date("2024-01-01T15:30:45.000Z");
      const currentOccurrence = new Date("2024-01-10T08:45:30.000Z");
      const result = calculateNextOccurrenceOnce(
        "DAILY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString()).toBe("2024-01-11T00:00:00.000Z");
    });
  });

  describe("WEEKLY", () => {
    test("should add 7 days to current occurrence", () => {
      const startDate = new Date("2024-01-01");
      const currentOccurrence = new Date("2024-01-08");
      const result = calculateNextOccurrenceOnce(
        "WEEKLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-01-15");
    });

    test("Week that spans across month boundary", () => {
      const startDate = new Date("2024-01-25");
      const currentOccurrence = new Date("2024-01-25");
      const result = calculateNextOccurrenceOnce(
        "WEEKLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-02-01");
    });

    test("Week that spans across year boundary", () => {
      const startDate = new Date("2023-12-28");
      const currentOccurrence = new Date("2023-12-28");
      const result = calculateNextOccurrenceOnce(
        "WEEKLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-01-04");
    });
  });

  describe("MONTHLY", () => {
    test("should maintain same day when month has sufficient days", () => {
      const startDate = new Date("2024-01-15");
      const currentOccurrence = new Date("2024-02-15");
      const result = calculateNextOccurrenceOnce(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-03-15");
    });

    test("January 29/30 → February overflow in non-leap", () => {
      const startDate = new Date("2023-01-30");
      const currentOccurrence = new Date("2023-01-30");
      const result = calculateNextOccurrenceOnce(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2023-02-28");
    });

    test("January 29/30 → February overflow in leap", () => {
      const startDate = new Date("2024-01-30");
      const currentOccurrence = new Date("2024-01-30");
      const result = calculateNextOccurrenceOnce(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-02-29");
    });

    test("December to January transition (year boundary)", () => {
      const startDate = new Date("2023-12-31");
      const currentOccurrence = new Date("2023-12-31");
      const result = calculateNextOccurrenceOnce(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-01-31");
    });

    test("February to March in non-leap year (Feb 28 → March 31)", () => {
      const startDate = new Date("2023-01-31");
      const currentOccurrence = new Date("2023-02-28");
      const result = calculateNextOccurrenceOnce(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2023-03-31");
    });

    test("should return to original day after leap year February overflow", () => {
      const startDate = new Date("2024-01-31");
      const currentOccurrence = new Date("2024-02-29");
      const result = calculateNextOccurrenceOnce(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-03-31");
    });

    test("should return to original day when next month has sufficient days", () => {
      const startDate = new Date("2023-01-31");
      const currentOccurrence = new Date("2023-02-28");
      const result = calculateNextOccurrenceOnce(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2023-03-31");
    });

    test("should clamp to last day when target month is shorter", () => {
      const startDate = new Date("2024-01-31");
      const currentOccurrence = new Date("2024-03-31");
      const result = calculateNextOccurrenceOnce(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-04-30");
    });
  });

  describe("YEARLY", () => {
    test("should handle Feb 28 consistently across non-leap years", () => {
      const startDate = new Date("2021-02-28"); // Non-leap year date
      const currentOccurrence = new Date("2022-02-28"); // Non-leap year date
      const result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2023-02-28"); // Non-leap year consideration
    });

    test("should fallback from Feb 29 to Feb 28 in non-leap year", () => {
      const startDate = new Date("2020-02-29"); // Leap year date
      const currentOccurrence = new Date("2024-02-29"); // Leap year date
      const result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2025-02-28"); // Non-leap year consideration
    });

    test("should return to Feb 29 when reaching leap year again", () => {
      const startDate = new Date("2020-02-29"); // Leap year date
      const currentOccurrence = new Date("2023-02-28"); // Non-leap year date
      const result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-02-29"); // Leap year consideration
    });

    test("should handle Feb 28 start across leap year transitions", () => {
      const startDate = new Date("2021-02-28"); // Non-leap year date
      const currentOccurrence = new Date("2024-02-29"); // Leap year date
      const result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2025-02-28"); // Non-leap year consideration
    });

    test("should maintain Feb 28 when transitioning to leap year", () => {
      const startDate = new Date("2021-02-28"); // Non-leap year date
      const currentOccurrence = new Date("2023-02-28"); // Non-leap year date
      const result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-02-28"); // Leap year consideration
    });

    test("should add one year to regular dates", () => {
      const startDate = new Date("2024-01-15");
      const currentOccurrence = new Date("2025-01-15");
      const result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2026-01-15");
    });

    test("Year boundary edge cases (Dec → Jan)", () => {
      const startDate = new Date("2023-12-31");
      const currentOccurrence = new Date("2023-12-31");
      const result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-12-31");
    });

    test("should handle non-February dates across leap years", () => {
      const startDate = new Date("2020-03-01");
      const currentOccurrence = new Date("2024-03-01");
      const result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2025-03-01");
    });

    test("Multi-year spans - Feb 29 leap year across multiple years", () => {
      const startDate = new Date("2020-02-29"); // Leap year start

      // Test the progression: 2020-02-29 → 2021-02-28 → 2022-02-28 → 2023-02-28 → 2024-02-29
      let currentOccurrence = new Date("2020-02-29");

      // 2020-02-29 → 2021-02-28 (non-leap)
      let result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2021-02-28");

      // 2021-02-28 → 2022-02-28 (non-leap)
      currentOccurrence = result;
      result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2022-02-28");

      // 2022-02-28 → 2023-02-28 (non-leap)
      currentOccurrence = result;
      result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2023-02-28");

      // 2023-02-28 → 2024-02-29 (leap year - should return to Feb 29)
      currentOccurrence = result;
      result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-02-29");

      // 2024-02-29 → 2025-02-28 (non-leap)
      currentOccurrence = result;
      result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2025-02-28");
    });

    test("Multi-year spans - regular date consistency", () => {
      const startDate = new Date("2020-01-15");

      // Test 5-year progression to ensure no drift
      let currentOccurrence = new Date("2020-01-15");

      // 2020-01-15 → 2021-01-15
      let result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2021-01-15");

      // 2021-01-15 → 2022-01-15
      currentOccurrence = result;
      result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2022-01-15");

      // 2022-01-15 → 2023-01-15
      currentOccurrence = result;
      result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2023-01-15");

      // 2023-01-15 → 2024-01-15 (leap year)
      currentOccurrence = result;
      result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-01-15");

      // 2024-01-15 → 2025-01-15
      currentOccurrence = result;
      result = calculateNextOccurrenceOnce(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2025-01-15");
    });
  });

  test("should handle identical start and current dates", () => {
    const startDate = new Date("2024-01-31");
    const currentOccurrence = new Date("2024-01-31");
    const result = calculateNextOccurrenceOnce(
      "MONTHLY",
      startDate,
      currentOccurrence
    );
    expect(result.toISOString().split("T")[0]).toBe("2024-02-29"); // Leap year consideration
  });

  test("Invalid frequency enum handling", () => {
    const startDate = new Date("2024-01-31");
    const currentOccurrence = new Date("2024-01-31");
    const result = calculateNextOccurrenceOnce(
      // @ts-expect-error Testing invalid frequency
      "INVALID_FREQUENCY",
      startDate,
      currentOccurrence
    );
    expect(result).toBeNull();
  });

  test("Month overflow for months with 30 vs 31 days (e.g., Jan 31 → April should be April 30, not May 1)", () => {
    const startDate = new Date("2024-01-31");
    const currentOccurrence = new Date("2024-03-31");
    const result = calculateNextOccurrenceOnce(
      "MONTHLY",
      startDate,
      currentOccurrence
    );
    expect(result.toISOString().split("T")[0]).toBe("2024-04-30");
  });
});

describe("calculateNextOccurrence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Future date scenarios (no catch-up needed)", () => {
    test("DAILY: current occurrence is in the future should return current occurrence", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-05-01");
      const currentOccurrence = new Date("2024-05-20"); // 5 days in future
      const result = calculateNextOccurrence(
        "DAILY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-05-20");
    });

    test("WEEKLY: current occurrence is in the future should return current occurrence", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-05-01");
      const currentOccurrence = new Date("2024-05-22"); // Next week
      const result = calculateNextOccurrence(
        "WEEKLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-05-22");
    });

    test("MONTHLY: current occurrence is in the future should return current occurrence", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-03-10");
      const currentOccurrence = new Date("2024-06-10"); // Next month
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-06-10");
    });

    test("YEARLY: current occurrence is in the future should return current occurrence", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2023-03-10");
      const currentOccurrence = new Date("2025-03-10"); // Next year
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2025-03-10");
    });
  });

  describe("Current occurrence equals today", () => {
    test("DAILY: today should return tomorrow", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-05-01");
      const currentOccurrence = new Date("2024-05-15"); // Today
      const result = calculateNextOccurrence(
        "DAILY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-05-16");
    });

    test("WEEKLY: today should return next week", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-05-01");
      const currentOccurrence = new Date("2024-05-15"); // Today
      const result = calculateNextOccurrence(
        "WEEKLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-05-22");
    });

    test("MONTHLY: today should return next month", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-03-15");
      const currentOccurrence = new Date("2024-05-15"); // Today
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-06-15");
    });

    test("YEARLY: today should return next year", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2020-05-15");
      const currentOccurrence = new Date("2024-05-15"); // Today
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2025-05-15");
    });
  });

  describe("Basic catch-up scenarios", () => {
    test("DAILY: 5 days in the past should skip to tomorrow", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-05-01");
      const currentOccurrence = new Date("2024-05-10"); // 5 days ago
      const result = calculateNextOccurrence(
        "DAILY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-05-16");
    });

    test("WEEKLY: 4 weeks in the past should skip to next week", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-04-01");
      const currentOccurrence = new Date("2024-04-17"); // 4 weeks ago
      const result = calculateNextOccurrence(
        "WEEKLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-05-22");
    });

    test("MONTHLY: 3 months in the past should skip to next month", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-01-10");
      const currentOccurrence = new Date("2024-02-10"); // 3 months ago
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-06-10");
    });

    test("YEARLY: 3 years in the past should skip to next year", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2020-03-10");
      const currentOccurrence = new Date("2021-03-10"); // 3 years ago
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2025-03-10");
    });
  });

  describe("Catch-up with month overflow edge cases", () => {
    test("MONTHLY: Jan 31 start, 4 months ago, should handle overflow and land on May 31", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-01-31");
      const currentOccurrence = new Date("2024-01-31"); // 4+ months ago
      // Expected progression: Jan 31 → Feb 29 (past) → Mar 31 (past) → Apr 30 (past) → May 31 (future)
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-05-31");
    });

    test("MONTHLY: Jan 31 start, current is Dec 31 (2 months ago), today is Feb 15", () => {
      vi.setSystemTime(new Date("2024-02-15T00:00:00.000Z"));

      const startDate = new Date("2023-01-31");
      const currentOccurrence = new Date("2023-12-31"); // 2 months ago
      // Expected progression: Dec 31 → Jan 31 (past) → Feb 29 (future)
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-02-29");
    });

    test("MONTHLY: Jan 30 start catches up through February in non-leap year", () => {
      vi.setSystemTime(new Date("2023-03-15T00:00:00.000Z"));

      const startDate = new Date("2023-01-30");
      const currentOccurrence = new Date("2023-01-30"); // 2 months ago
      // Expected progression: Jan 30 → Feb 28 (past) → Mar 30 (future)
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2023-03-30");
    });
  });

  describe("Catch-up with leap year edge cases", () => {
    test("YEARLY: Feb 29 2020 start, catches up through multiple non-leap years to 2026", () => {
      vi.setSystemTime(new Date("2025-12-01T00:00:00.000Z"));

      const startDate = new Date("2020-02-29");
      const currentOccurrence = new Date("2020-02-29"); // 5+ years ago
      // Expected progression: 2020-02-29 → 2021-02-28 (past) → 2022-02-28 (past)
      // → 2023-02-28 (past) → 2024-02-29 (past) → 2025-02-28 (past) → 2026-02-28 (future)
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2026-02-28");
    });

    test("YEARLY: Feb 29 2020 start, current is Feb 28 2023, should go to Feb 29 2024", () => {
      vi.setSystemTime(new Date("2024-01-15T00:00:00.000Z"));

      const startDate = new Date("2020-02-29");
      const currentOccurrence = new Date("2023-02-28"); // About 11 months ago
      // Expected: 2023-02-28 → 2024-02-29 (future, leap year)
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-02-29");
    });

    test("YEARLY: Feb 29 2024 start, current is Feb 29 2024, today is Mar 1 2024, should go to 2025-02-28", () => {
      vi.setSystemTime(new Date("2024-03-01T00:00:00.000Z"));

      const startDate = new Date("2024-02-29");
      const currentOccurrence = new Date("2024-02-29"); // Yesterday
      // Expected: 2024-02-29 → 2025-02-28 (future, non-leap year)
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2025-02-28");
    });
  });

  describe("Catch-up spanning year boundaries", () => {
    test("MONTHLY: Dec 15 (14 months ago), today is Feb 20 next year", () => {
      vi.setSystemTime(new Date("2025-02-20T00:00:00.000Z"));

      const startDate = new Date("2023-12-15");
      const currentOccurrence = new Date("2023-12-15"); // 14 months ago
      // Should skip through all of 2024 and land in Mar 2025
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2025-03-15");
    });

    test("WEEKLY: Week in December last year, today is January this year", () => {
      vi.setSystemTime(new Date("2025-01-20T00:00:00.000Z"));

      const startDate = new Date("2024-12-01");
      const currentOccurrence = new Date("2024-12-02"); // About 7 weeks ago
      // Should skip weeks and land in future January
      const result = calculateNextOccurrence(
        "WEEKLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2025-01-27");
    });

    test("DAILY: Dec 31 last year, today is Jan 5 this year", () => {
      vi.setSystemTime(new Date("2025-01-05T00:00:00.000Z"));

      const startDate = new Date("2024-12-01");
      const currentOccurrence = new Date("2024-12-31"); // 5 days ago
      // Should skip to Jan 6 2025
      const result = calculateNextOccurrence(
        "DAILY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2025-01-06");
    });
  });

  describe("Edge case: Exactly one period in the past", () => {
    test("DAILY: Yesterday should return tomorrow", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-05-01");
      const currentOccurrence = new Date("2024-05-14"); // Yesterday
      const result = calculateNextOccurrence(
        "DAILY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-05-16");
    });

    test("WEEKLY: Exactly 7 days ago should return 7 days from now", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-05-01");
      const currentOccurrence = new Date("2024-05-08"); // Exactly 7 days ago
      const result = calculateNextOccurrence(
        "WEEKLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-05-22");
    });

    test("MONTHLY: Exactly one month ago should return next month", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-03-15");
      const currentOccurrence = new Date("2024-04-15"); // Exactly 1 month ago
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-06-15");
    });

    test("YEARLY: Exactly one year ago should return next year", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2020-05-15");
      const currentOccurrence = new Date("2023-05-15"); // Exactly 1 year ago
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2025-05-15");
    });
  });

  describe("Invalid frequency and edge cases", () => {
    test("Invalid frequency should return null", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-05-01");
      const currentOccurrence = new Date("2024-05-10");
      const result = calculateNextOccurrence(
        // @ts-expect-error Testing invalid frequency
        "INVALID_FREQUENCY",
        startDate,
        currentOccurrence
      );

      expect(result).toBeNull();
    });
  });

  describe("UTC normalization with time components", () => {
    test("Input dates with time components should be normalized to UTC midnight", () => {
      vi.setSystemTime(new Date("2024-05-15T12:30:45.000Z")); // Noon UTC

      const startDate = new Date("2024-05-01T15:30:45.000Z");
      const currentOccurrence = new Date("2024-05-10T08:45:30.000Z"); // 5 days ago
      const result = calculateNextOccurrence(
        "DAILY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString()).toBe("2024-05-16T00:00:00.000Z");
    });

    test("Today comparison should work at UTC midnight boundary", () => {
      vi.setSystemTime(new Date("2024-05-15T23:59:59.999Z")); // Almost midnight

      const startDate = new Date("2024-05-01");
      const currentOccurrence = new Date("2024-05-14T12:00:00.000Z"); // Yesterday with time
      const result = calculateNextOccurrence(
        "DAILY",
        startDate,
        currentOccurrence
      );

      // Should still be 2024-05-16 because today (2024-05-15) is normalized to midnight
      expect(result.toISOString().split("T")[0]).toBe("2024-05-16");
    });
  });

  describe("Complex catch-up scenarios", () => {
    test("DAILY: 100 days in the past should efficiently skip to tomorrow", () => {
      vi.setSystemTime(new Date("2024-05-15T00:00:00.000Z"));

      const startDate = new Date("2024-01-01");
      const currentOccurrence = new Date("2024-02-05"); // ~100 days ago
      const result = calculateNextOccurrence(
        "DAILY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-05-16");
    });

    test("MONTHLY: Catch-up through multiple month overflows (Jan 31 → Feb → Mar → Apr)", () => {
      vi.setSystemTime(new Date("2024-04-25T00:00:00.000Z"));

      const startDate = new Date("2024-01-31");
      const currentOccurrence = new Date("2024-01-31"); // 3 months ago
      // Jan 31 → Feb 29 (past) → Mar 31 (past) → Apr 30 (future)
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2024-04-30");
    });

    test("YEARLY: Catch-up from leap year Feb 29 through 8 years", () => {
      vi.setSystemTime(new Date("2028-03-01T00:00:00.000Z"));

      const startDate = new Date("2020-02-29");
      const currentOccurrence = new Date("2020-02-29"); // 8 years ago
      // 2020 Feb 29 → 2021-28 → 2022-28 → 2023-28 → 2024 Feb 29 → 2025-28 → 2026-28 → 2027-28 → 2028 Feb 29 (past) → 2029-28 (future)
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );

      expect(result.toISOString().split("T")[0]).toBe("2029-02-28");
    });
  });
});
