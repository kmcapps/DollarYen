export function convertUsdToRoundedJpy(value: string, rate: number): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) {
    return 0;
  }

  return Math.round(amount * rate);
}

export function formatJpyInteger(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Math.round(value).toLocaleString("en-US");
}

export function formatRate(rate: number): string {
  if (!Number.isFinite(rate)) {
    return "0.00";
  }

  return rate.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: countFractionDigits(rate),
  });
}

function countFractionDigits(value: number): number {
  const fraction = value.toString().split(".")[1];
  return Math.max(2, fraction?.length ?? 0);
}
