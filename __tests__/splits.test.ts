import { calculateSplit, buildEqualParticipants, formatCents, parseDollarsToCents } from "@/lib/domain/splits";
import { ShareType } from "@/lib/constants";

describe("calculateSplit — EQUAL", () => {
  it("splits evenly with no remainder", () => {
    const result = calculateSplit({
      totalCents: 3000,
      participants: buildEqualParticipants(["a", "b", "c"], 3000),
    });
    expect(result.results).toEqual([
      { contactId: "a", amountCents: 1000 },
      { contactId: "b", amountCents: 1000 },
      { contactId: "c", amountCents: 1000 },
    ]);
    expect(result.isBalanced).toBe(true);
    expect(result.remainder).toBe(0);
  });

  it("distributes remainder cents one-by-one", () => {
    // $10.00 / 3 = $3.33 + $3.33 + $3.34
    const result = calculateSplit({
      totalCents: 1000,
      participants: buildEqualParticipants(["a", "b", "c"], 1000),
    });
    const amounts = result.results.map((r) => r.amountCents);
    expect(amounts.reduce((s, n) => s + n, 0)).toBe(1000);
    expect(Math.max(...amounts) - Math.min(...amounts)).toBeLessThanOrEqual(1);
    expect(result.isBalanced).toBe(true);
  });

  it("works for 2 people on odd amounts", () => {
    const result = calculateSplit({
      totalCents: 101,
      participants: buildEqualParticipants(["a", "b"], 101),
    });
    expect(result.results[0].amountCents + result.results[1].amountCents).toBe(101);
    expect(result.isBalanced).toBe(true);
  });
});

describe("calculateSplit — PERCENTAGE", () => {
  it("splits by percentage correctly", () => {
    const result = calculateSplit({
      totalCents: 10000,
      participants: [
        { contactId: "a", shareType: ShareType.PERCENTAGE, shareValue: 5000 }, // 50%
        { contactId: "b", shareType: ShareType.PERCENTAGE, shareValue: 3000 }, // 30%
        { contactId: "c", shareType: ShareType.PERCENTAGE, shareValue: 2000 }, // 20%
      ],
    });
    expect(result.results.find((r) => r.contactId === "a")?.amountCents).toBe(5000);
    expect(result.results.find((r) => r.contactId === "b")?.amountCents).toBe(3000);
    expect(result.results.find((r) => r.contactId === "c")?.amountCents).toBe(2000);
    expect(result.isBalanced).toBe(true);
  });

  it("total allocated equals input total", () => {
    const result = calculateSplit({
      totalCents: 9999,
      participants: [
        { contactId: "a", shareType: ShareType.PERCENTAGE, shareValue: 3334 },
        { contactId: "b", shareType: ShareType.PERCENTAGE, shareValue: 3333 },
        { contactId: "c", shareType: ShareType.PERCENTAGE, shareValue: 3333 },
      ],
    });
    expect(result.totalAllocated).toBe(9999);
    expect(result.isBalanced).toBe(true);
  });
});

describe("calculateSplit — FIXED", () => {
  it("uses fixed amounts directly", () => {
    const result = calculateSplit({
      totalCents: 5000,
      participants: [
        { contactId: "a", shareType: ShareType.FIXED, shareValue: 3000 },
        { contactId: "b", shareType: ShareType.FIXED, shareValue: 2000 },
      ],
    });
    expect(result.results[0].amountCents).toBe(3000);
    expect(result.results[1].amountCents).toBe(2000);
    expect(result.totalAllocated).toBe(5000);
  });
});

describe("formatCents", () => {
  it("formats positive cents", () => expect(formatCents(5025)).toBe("$50.25"));
  it("formats negative cents", () => expect(formatCents(-1099)).toBe("-$10.99"));
  it("formats zero", () => expect(formatCents(0)).toBe("$0.00"));
});

describe("parseDollarsToCents", () => {
  it("parses dollar string", () => expect(parseDollarsToCents("$12.50")).toBe(1250));
  it("handles no dollar sign", () => expect(parseDollarsToCents("9.99")).toBe(999));
  it("handles integer", () => expect(parseDollarsToCents("10")).toBe(1000));
});
