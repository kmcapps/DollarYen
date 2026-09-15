import { formatUsdInput } from '../domain/amountInput'
import { convertUsdToRoundedJpy, formatJpyInteger } from '../domain/money'
import type { RateObservation } from '../rates/types'

type AmountDisplayProps = { amount: string; rate: RateObservation | null }

export function AmountDisplay({ amount, rate }: AmountDisplayProps) {
  const jpy = rate ? formatJpyInteger(convertUsdToRoundedJpy(amount, rate.rate)) : '—'

  return <section className="amount-display" aria-label="換算結果">
    <div className="currency-output usd-surface"><span className="currency-label">USD</span><output aria-label="米ドル金額" className="usd-amount">${formatUsdInput(amount)}</output></div>
    <div className="currency-output jpy-output jpy-surface"><span className="currency-label">JPY</span><output aria-label="日本円金額" className="jpy-amount">{rate ? <><span className="yen-symbol">¥</span>{jpy}</> : jpy}</output></div>
  </section>
}
