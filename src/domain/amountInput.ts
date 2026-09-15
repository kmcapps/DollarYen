export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type AmountAction =
  | { type: "digit"; digit: Digit }
  | { type: "decimal" }
  | { type: "backspace" }
  | { type: "clear" };
export type RejectionReason = "duplicate-decimal" | "integer-limit" | "fraction-limit";
export interface AmountTransition {
  value: string;
  changed: boolean;
  rejection?: RejectionReason;
}

const MAX_INTEGER_DIGITS = 12;
const MAX_FRACTION_DIGITS = 2;

export function reduceAmount(current: string, action: AmountAction): AmountTransition {
  const value = normalizeAmount(current);

  if (action.type === "clear") {
    return transition(value, "0");
  }

  if (action.type === "backspace") {
    if (value === "0") {
      return { value: "0", changed: false };
    }

    return transition(value, value.length === 1 ? "0" : value.slice(0, -1));
  }

  if (action.type === "decimal") {
    if (value.includes(".")) {
      return { value, changed: false, rejection: "duplicate-decimal" };
    }

    return transition(value, `${value}.`);
  }

  const [integer, fraction = ""] = value.split(".");
  if (value.includes(".")) {
    if (fraction.length >= MAX_FRACTION_DIGITS) {
      return { value, changed: false, rejection: "fraction-limit" };
    }

    return transition(value, `${integer}.${fraction}${action.digit}`);
  }

  if (integer.length >= MAX_INTEGER_DIGITS && !(integer === "0" && action.digit === "0")) {
    return { value, changed: false, rejection: "integer-limit" };
  }

  const next = integer === "0" ? action.digit : `${integer}${action.digit}`;
  return transition(value, next);
}

export function formatUsdInput(value: string): string {
  const amount = normalizeAmount(value);
  if (amount === "0" && value !== "0") {
    return "0";
  }

  const [integer, fraction] = amount.split(".");
  const groupedInteger = Number.parseInt(integer, 10).toLocaleString("en-US");

  if (fraction === undefined) {
    return groupedInteger;
  }

  return `${groupedInteger}.${fraction}`;
}

function normalizeAmount(value: string): string {
  if (!/^\d+(?:\.\d*)?$/.test(value)) {
    return "0";
  }

  return value;
}

function transition(current: string, value: string): AmountTransition {
  return { value, changed: value !== current };
}
