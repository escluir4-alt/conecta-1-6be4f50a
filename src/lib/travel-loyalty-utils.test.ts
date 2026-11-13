import { describe, expect, it } from "vitest";
import {
  calculateAwardComparison,
  isExpiringWithinDays,
  parseLocalizedNumber,
} from "./travel-loyalty-utils";

describe("travel loyalty utilities", () => {
  it("parses Brazilian number input", () => {
    expect(parseLocalizedNumber("1.500,00")).toBe(1500);
    expect(parseLocalizedNumber("0,015")).toBe(0.015);
    expect(parseLocalizedNumber("25000")).toBe(25000);
    expect(parseLocalizedNumber("invalid")).toBe(0);
  });

  it("detects expiration within the configured range, including today", () => {
    const today = new Date(2026, 10, 13);
    expect(isExpiringWithinDays("2026-11-13", 90, today)).toBe(true);
    expect(isExpiringWithinDays("2027-02-11", 90, today)).toBe(true);
    expect(isExpiringWithinDays("2027-02-12", 90, today)).toBe(false);
    expect(isExpiringWithinDays("2026-11-12", 90, today)).toBe(false);
    expect(isExpiringWithinDays("2026-02-30", 90, today)).toBe(false);
  });

  it("accounts for fees and recommends miles when redemption is economically cheaper", () => {
    expect(calculateAwardComparison({ cashFare: 1500, miles: 25000, fees: 50, valuePerMile: 0.015 })).toEqual({
      redemptionCost: 425,
      savings: 1075,
      effectiveCpm: 58,
      referenceCpm: 15,
      recommendation: "Usar milhas",
    });
  });

  it("recommends cash when the opportunity cost of miles is higher", () => {
    const result = calculateAwardComparison({ cashFare: 1500, miles: 25000, fees: 0, valuePerMile: 0.09 });
    expect(result?.recommendation).toBe("Pagar em dinheiro");
    expect(result?.savings).toBe(-750);
  });

  it("rejects invalid comparison inputs", () => {
    expect(calculateAwardComparison({ cashFare: 0, miles: 1000, fees: 0, valuePerMile: 0.01 })).toBeNull();
    expect(calculateAwardComparison({ cashFare: 100, miles: 1000, fees: -1, valuePerMile: 0.01 })).toBeNull();
  });
});
