import { describe, expect, it } from "vitest";
import { calculateCardDebtOverlap } from "./card-debt-reconciliation";

describe("card debt overlap", () => {
  it("does not deduct unconfirmed debts", () => {
    expect(calculateCardDebtOverlap([{key:"bill:a",open:30000}], [], [{id:"card",usedCents:50000}]).overlap).toBe(0);
  });
  it("deducts linked outstanding once, not the full original obligation", () => {
    const r = calculateCardDebtOverlap([{key:"bill:a",open:3500}], [{liability_key:"bill:a",card_id:"card"}], [{id:"card",usedCents:20000}]);
    expect(r.overlap).toBe(3500);
  });
  it("caps overlaps by the amount used on each card", () => {
    const r = calculateCardDebtOverlap([{key:"bill:a",open:12000},{key:"bill:b",open:15000}], [
      {liability_key:"bill:a",card_id:"card"},{liability_key:"bill:b",card_id:"card"},
    ], [{id:"card",usedCents:10000}]);
    expect(r.overlap).toBe(10000);
  });
  it("does not deduct paid obligations and ignores unavailable cards", () => {
    const r = calculateCardDebtOverlap([{key:"bill:a",open:0},{key:"bill:b",open:9000}], [
      {liability_key:"bill:a",card_id:"card"},{liability_key:"bill:b",card_id:"old"},
    ], [{id:"card",usedCents:20000}]);
    expect(r.overlap).toBe(0);
    expect(r.unmatchedLinked).toBe(1);
  });
  it("ignores repeated mappings for same obligation", () => {
    expect(calculateCardDebtOverlap([{key:"bill:a",open:4000}], [
      {liability_key:"bill:a",card_id:"card"}, {liability_key:"bill:a",card_id:"card"},
    ], [{id:"card",usedCents:10000}]).overlap).toBe(4000);
  });
});
