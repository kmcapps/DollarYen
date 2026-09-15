import { describe, expect, it } from "vitest";
import { formatUsdInput, reduceAmount, type AmountAction } from "./amountInput";

describe("reduceAmount", () => {
  it.each([
    ["0 + 0 stays 0", "0", { type: "digit", digit: "0" }, { value: "0", changed: false }],
    ["0 + 5 becomes 5", "0", { type: "digit", digit: "5" }, { value: "5", changed: true }],
    ["0 + decimal becomes 0.", "0", { type: "decimal" }, { value: "0.", changed: true }],
  ] satisfies Array<[string, string, AmountAction, ReturnType<typeof reduceAmount>]>)(
    "%s",
    (_name, current, action, want) => {
      expect(reduceAmount(current, action)).toEqual(want);
    },
  );

  it("rejects a repeated decimal without changing the value", () => {
    expect(reduceAmount("12.3", { type: "decimal" })).toEqual({
      value: "12.3",
      changed: false,
      rejection: "duplicate-decimal",
    });
  });

  it("accepts twelve integer digits and rejects the thirteenth digit", () => {
    expect(reduceAmount("12345678901", { type: "digit", digit: "2" })).toEqual({
      value: "123456789012",
      changed: true,
    });
    expect(reduceAmount("123456789012", { type: "digit", digit: "3" })).toEqual({
      value: "123456789012",
      changed: false,
      rejection: "integer-limit",
    });
  });

  it("accepts two fractional digits and rejects the third digit", () => {
    expect(reduceAmount("12.3", { type: "digit", digit: "4" })).toEqual({
      value: "12.34",
      changed: true,
    });
    expect(reduceAmount("12.34", { type: "digit", digit: "5" })).toEqual({
      value: "12.34",
      changed: false,
      rejection: "fraction-limit",
    });
  });

  it.each([
    ["0", "0", false],
    ["0.", "0", true],
    ["0.0", "0.", true],
    ["12", "1", true],
    ["1", "0", true],
  ])("backspace maps %s to %s", (current, value, changed) => {
    expect(reduceAmount(current, { type: "backspace" })).toEqual({ value, changed });
  });

  it.each([
    ["0", false],
    ["12.34", true],
  ])("clear maps %s to 0", (current, changed) => {
    expect(reduceAmount(current, { type: "clear" })).toEqual({ value: "0", changed });
  });
});

describe("formatUsdInput", () => {
  it.each([
    ["1234567.", "1,234,567."],
    ["1234567.00", "1,234,567.00"],
    ["1234567.50", "1,234,567.50"],
  ])("formats %s as %s", (value, want) => {
    expect(formatUsdInput(value)).toBe(want);
  });

  it.each([
    ["", "0"],
    ["not-a-number", "0"],
    ["Infinity", "0"],
  ])("defensively formats invalid input %s as %s", (value, want) => {
    expect(formatUsdInput(value)).toBe(want);
  });
});
