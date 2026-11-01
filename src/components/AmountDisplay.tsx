import { useLayoutEffect, useRef } from 'react'
import { formatUsdInput } from '../domain/amountInput'
import { convertUsdToRoundedJpy, formatJpyInteger } from '../domain/money'
import type { RateObservation } from '../rates/types'

type AmountDisplayProps = { amount: string; expression: string | null; error: string | null; rate: RateObservation | null }

export function AmountDisplay({ amount, expression, error, rate }: AmountDisplayProps) {
  const expressionRef = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const element = expressionRef.current
    if (element) element.scrollLeft = element.scrollWidth
  }, [expression])
  const roundedJpy = rate ? convertUsdToRoundedJpy(amount, rate.rate) : null
  const jpy = roundedJpy === null ? '—' : formatJpyInteger(Math.abs(roundedJpy))
  const negativeUsd = amount.startsWith('-')

  return <section className="amount-display" aria-label="換算結果">
    <div className="currency-output usd-surface">
      <div className="usd-values">
        <span ref={expressionRef} className="usd-expression" title={expression ?? undefined} aria-label={expression ? '米ドルの計算式' : undefined} aria-hidden={expression ? undefined : true}>{expression}</span>
        <output aria-label="米ドル金額" className="usd-amount">{negativeUsd ? '-' : ''}${formatUsdInput(negativeUsd ? amount.slice(1) : amount)}</output>
        {error ? <p className="input-notice" role="status" aria-label="入力のお知らせ">{error}</p> : null}
      </div>
    </div>
    <div className="currency-output jpy-output jpy-surface"><output aria-label="日本円金額" className="jpy-amount">{rate ? <>{roundedJpy !== null && roundedJpy < 0 ? '-' : ''}<span className="yen-symbol">¥</span>{jpy}</> : jpy}</output></div>
  </section>
}
