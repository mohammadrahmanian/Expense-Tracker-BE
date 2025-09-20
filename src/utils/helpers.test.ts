import { describe, expect, test } from "vitest";
import { calculateNextOccurrence } from "./helpers";

describe("calculateNextOccurrence", () => {
  describe("DAILY", () => {
    test("should add one day to current occurrence", () => {
      const startDate = new Date("2024-01-01");
      const currentOccurrence = new Date("2024-01-10");
      const result = calculateNextOccurrence(
        "DAILY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-01-11");
    });

    test("Month boundary transition", () => {
      const startDate = new Date("2024-01-31");
      const currentOccurrence = new Date("2024-01-31");
      const result = calculateNextOccurrence(
        "DAILY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-02-01");
    });

    test("Year boundary transition", () => {
      const startDate = new Date("2023-12-31");
      const currentOccurrence = new Date("2023-12-31");
      const result = calculateNextOccurrence(
        "DAILY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-01-01");
    });

    test("Leap year Feb 28 → Feb 29", () => {
      const startDate = new Date("2024-02-28");
      const currentOccurrence = new Date("2024-02-28");
      const result = calculateNextOccurrence(
        "DAILY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-02-29");
    });

    test("Non-leap year Feb 28 → Mar 1", () => {
      const startDate = new Date("2023-02-28");
      const currentOccurrence = new Date("2023-02-28");
      const result = calculateNextOccurrence(
        "DAILY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2023-03-01");
    });

    test("Time component handling - should normalize to UTC midnight", () => {
      const startDate = new Date("2024-01-01T15:30:45.000Z");
      const currentOccurrence = new Date("2024-01-10T08:45:30.000Z");
      const result = calculateNextOccurrence(
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
      const result = calculateNextOccurrence(
        "WEEKLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-01-15");
    });

    test("Week that spans across month boundary", () => {
      const startDate = new Date("2024-01-25");
      const currentOccurrence = new Date("2024-01-25");
      const result = calculateNextOccurrence(
        "WEEKLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-02-01");
    });

    test("Week that spans across year boundary", () => {
      const startDate = new Date("2023-12-28");
      const currentOccurrence = new Date("2023-12-28");
      const result = calculateNextOccurrence(
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
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-03-15");
    });

    test("January 29/30 → February overflow in non-leap", () => {
      const startDate = new Date("2023-01-30");
      const currentOccurrence = new Date("2023-01-30");
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2023-02-28");
    });

    test("January 29/30 → February overflow in leap", () => {
      const startDate = new Date("2024-01-30");
      const currentOccurrence = new Date("2024-01-30");
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-02-29");
    });

    test("December to January transition (year boundary)", () => {
      const startDate = new Date("2023-12-31");
      const currentOccurrence = new Date("2023-12-31");
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-01-31");
    });

    test("February to March in non-leap year (Feb 28 → March 31)", () => {
      const startDate = new Date("2023-01-31");
      const currentOccurrence = new Date("2023-02-28");
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2023-03-31");
    });

    test("should return to original day after leap year February overflow", () => {
      const startDate = new Date("2024-01-31");
      const currentOccurrence = new Date("2024-02-29");
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-03-31");
    });

    test("should return to original day when next month has sufficient days", () => {
      const startDate = new Date("2023-01-31");
      const currentOccurrence = new Date("2023-02-28");
      const result = calculateNextOccurrence(
        "MONTHLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2023-03-31");
    });

    test("should clamp to last day when target month is shorter", () => {
      const startDate = new Date("2024-01-31");
      const currentOccurrence = new Date("2024-03-31");
      const result = calculateNextOccurrence(
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
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2023-02-28"); // Non-leap year consideration
    });

    test("should fallback from Feb 29 to Feb 28 in non-leap year", () => {
      const startDate = new Date("2020-02-29"); // Leap year date
      const currentOccurrence = new Date("2024-02-29"); // Leap year date
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2025-02-28"); // Non-leap year consideration
    });

    test("should return to Feb 29 when reaching leap year again", () => {
      const startDate = new Date("2020-02-29"); // Leap year date
      const currentOccurrence = new Date("2023-02-28"); // Non-leap year date
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-02-29"); // Leap year consideration
    });

    test("should handle Feb 28 start across leap year transitions", () => {
      const startDate = new Date("2021-02-28"); // Non-leap year date
      const currentOccurrence = new Date("2024-02-29"); // Leap year date
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2025-02-28"); // Non-leap year consideration
    });

    test("should maintain Feb 28 when transitioning to leap year", () => {
      const startDate = new Date("2021-02-28"); // Non-leap year date
      const currentOccurrence = new Date("2023-02-28"); // Non-leap year date
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-02-28"); // Leap year consideration
    });

    test("should add one year to regular dates", () => {
      const startDate = new Date("2024-01-15");
      const currentOccurrence = new Date("2025-01-15");
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2026-01-15");
    });

    test("Year boundary edge cases (Dec → Jan)", () => {
      const startDate = new Date("2023-12-31");
      const currentOccurrence = new Date("2023-12-31");
      const result = calculateNextOccurrence(
        "YEARLY",
        startDate,
        currentOccurrence
      );
      expect(result.toISOString().split("T")[0]).toBe("2024-12-31");
    });

    test("should handle non-February dates across leap years", () => {
      const startDate = new Date("2020-03-01");
      const currentOccurrence = new Date("2024-03-01");
      const result = calculateNextOccurrence(
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
      let result = calculateNextOccurrence("YEARLY", startDate, currentOccurrence);
      expect(result.toISOString().split("T")[0]).toBe("2021-02-28");

      // 2021-02-28 → 2022-02-28 (non-leap)
      currentOccurrence = result;
      result = calculateNextOccurrence("YEARLY", startDate, currentOccurrence);
      expect(result.toISOString().split("T")[0]).toBe("2022-02-28");

      // 2022-02-28 → 2023-02-28 (non-leap)
      currentOccurrence = result;
      result = calculateNextOccurrence("YEARLY", startDate, currentOccurrence);
      expect(result.toISOString().split("T")[0]).toBe("2023-02-28");

      // 2023-02-28 → 2024-02-29 (leap year - should return to Feb 29)
      currentOccurrence = result;
      result = calculateNextOccurrence("YEARLY", startDate, currentOccurrence);
      expect(result.toISOString().split("T")[0]).toBe("2024-02-29");

      // 2024-02-29 → 2025-02-28 (non-leap)
      currentOccurrence = result;
      result = calculateNextOccurrence("YEARLY", startDate, currentOccurrence);
      expect(result.toISOString().split("T")[0]).toBe("2025-02-28");
    });

    test("Multi-year spans - regular date consistency", () => {
      const startDate = new Date("2020-01-15");

      // Test 5-year progression to ensure no drift
      let currentOccurrence = new Date("2020-01-15");

      // 2020-01-15 → 2021-01-15
      let result = calculateNextOccurrence("YEARLY", startDate, currentOccurrence);
      expect(result.toISOString().split("T")[0]).toBe("2021-01-15");

      // 2021-01-15 → 2022-01-15
      currentOccurrence = result;
      result = calculateNextOccurrence("YEARLY", startDate, currentOccurrence);
      expect(result.toISOString().split("T")[0]).toBe("2022-01-15");

      // 2022-01-15 → 2023-01-15
      currentOccurrence = result;
      result = calculateNextOccurrence("YEARLY", startDate, currentOccurrence);
      expect(result.toISOString().split("T")[0]).toBe("2023-01-15");

      // 2023-01-15 → 2024-01-15 (leap year)
      currentOccurrence = result;
      result = calculateNextOccurrence("YEARLY", startDate, currentOccurrence);
      expect(result.toISOString().split("T")[0]).toBe("2024-01-15");

      // 2024-01-15 → 2025-01-15
      currentOccurrence = result;
      result = calculateNextOccurrence("YEARLY", startDate, currentOccurrence);
      expect(result.toISOString().split("T")[0]).toBe("2025-01-15");
    });
  });

  test("should handle identical start and current dates", () => {
    const startDate = new Date("2024-01-31");
    const currentOccurrence = new Date("2024-01-31");
    const result = calculateNextOccurrence(
      "MONTHLY",
      startDate,
      currentOccurrence
    );
    expect(result.toISOString().split("T")[0]).toBe("2024-02-29"); // Leap year consideration
  });

  test("Invalid frequency enum handling", () => {
    const startDate = new Date("2024-01-31");
    const currentOccurrence = new Date("2024-01-31");
    const result = calculateNextOccurrence(
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
    const result = calculateNextOccurrence(
      "MONTHLY",
      startDate,
      currentOccurrence
    );
    expect(result.toISOString().split("T")[0]).toBe("2024-04-30");
  });
});
