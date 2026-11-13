export type AwardComparison = {
  redemptionCost: number;
  savings: number;
  effectiveCpm: number;
  referenceCpm: number;
  recommendation: "Usar milhas" | "Pagar em dinheiro";
};

/** Parse Brazilian decimal input without losing fractional point valuations. */
export function parseLocalizedNumber(raw: string): number {
  const value = raw.trim().replace(/\s/g, "");
  if (!value) return 0;

  let normalized = value;
  if (value.includes(",")) {
    normalized = value.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(value)) {
    normalized = value.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isExpiringWithinDays(expiration: string, days = 90, now = new Date()): boolean {
  if (!expiration || !Number.isInteger(days) || days < 0) return false;
  const [year, month, day] = expiration.split("-").map(Number);
  if (!year || !month || !day) return false;
  const target = new Date(year, month - 1, day);
  if (target.getFullYear() !== year || target.getMonth() !== month - 1 || target.getDate() !== day) {
    return false;
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const remaining = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  return remaining >= 0 && remaining <= days;
}

export function calculateAwardComparison(input: {
  cashFare: number;
  miles: number;
  fees: number;
  valuePerMile: number;
}): AwardComparison | null {
  const { cashFare, miles, fees, valuePerMile } = input;
  if (
    !Number.isFinite(cashFare) || !Number.isFinite(miles) ||
    !Number.isFinite(fees) || !Number.isFinite(valuePerMile) ||
    cashFare <= 0 || miles <= 0 || fees < 0 || valuePerMile <= 0
  ) return null;

  const redemptionCost = miles * valuePerMile + fees;
  const savings = cashFare - redemptionCost;
  return {
    redemptionCost,
    savings,
    effectiveCpm: ((cashFare - fees) / miles) * 1000,
    referenceCpm: valuePerMile * 1000,
    recommendation: savings > 0 ? "Usar milhas" : "Pagar em dinheiro",
  };
}
