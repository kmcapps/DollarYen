import { describe, expect, it } from "vitest";
import { convertUsdToRoundedJpy, formatJpyInteger, formatRate } from "./money";

describe("convertUsdToRoundedJpy", () => {
  it("converts USD input to whole yen using normal numeric rounding", () => {
    expect(convertUsdToRoundedJpy("100", 154.31)).toBe(15431);
  });

  it.each([
    ["", 154.31],
    ["not-a-number", 154.31],
    ["100", Number.POSITIVE_INFINITY],
  ])("defensively converts invalid values %s at rate %s to 0", (value, rate) => {
    expect(convertUsdToRoundedJpy(value, rate)).toBe(0);
  });
});

describe("formatJpyInteger", () => {
  it("formats yen digits with grouping and no currency symbol", () => {
    expect(formatJpyInteger(15431)).toBe("15,431");
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("defensively formats %s as 0", (value) => {
    expect(formatJpyInteger(value)).toBe("0");
  });
});

describe("formatRate", () => {
  it.each([
    [154.3, "154.30"],
    [154.31, "154.31"],
    [154.315, "154.315"],
  ])("formats %s as %s", (rate, want) => {
    expect(formatRate(rate)).toBe(want);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("defensively formats %s as 0.00", (rate) => {
    expect(formatRate(rate)).toBe("0.00");
  });
});
