import { formatUsdInput } from '../domain/amountInput'
import { convertUsdToRoundedJpy, formatJpyInteger } from '../domain/money'
import type { RateObservation } from '../rates/types'

type AmountDisplayProps = { amount: string; expression: string | null; error: string | null; rate: RateObservation | null }

export function AmountDisplay({ amount, expression, error, rate }: AmountDisplayProps) {
  const jpy = rate ? formatJpyInteger(convertUsdToRoundedJpy(amount, rate.rate)) : '—'

  return <section className="amount-display" aria-label="換算結果">
    <div className="currency-output usd-surface">
      <div className="usd-values">
        <span className="usd-expression" aria-label={expression ? '米ドルの計算式' : undefined} aria-hidden={expression ? undefined : true}>{expression}</span>
        <output aria-label="米ドル金額" className="usd-amount">${formatUsdInput(amount)}</output>
        {error ? <p className="input-notice" role="status" aria-label="入力のお知らせ">{error}</p> : null}
      </div>
    </div>
    <div className="currency-output jpy-output jpy-surface"><output aria-label="日本円金額" className="jpy-amount">{rate ? <><span className="yen-symbol">¥</span>{jpy}</> : jpy}</output></div>
  </section>
}
