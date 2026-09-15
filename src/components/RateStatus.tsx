import type { ExchangeRateController } from '../hooks/useExchangeRate'
import { formatRate } from '../domain/money'

type RateStatusProps = Pick<ExchangeRateController, 'state' | 'refresh'>

function fetchedTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '取得 —'
  return `取得 ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })}`
}

export function RateSummary({ state }: Pick<ExchangeRateController, 'state'>) {
  const isLoading = state.kind === 'loading'
  const primary = state.kind === 'online' ? 'オンライン取得済み' : state.kind === 'cached' ? '保存済みレート・最新ではありません' : state.kind === 'loading' && state.rate ? '保存済みレートを表示中・更新確認中' : state.kind === 'unavailable' ? 'レートを取得できません' : 'レートを取得中'

  if (isLoading && state.rate === null) return null

  return <p className={`rate-state rate-summary--${state.kind}`} aria-live="polite"><span className="state-dot" aria-hidden="true" />{primary}</p>
}

export function RateStatus({ state, refresh }: RateStatusProps) {
  const isLoading = state.kind === 'loading'
  const isStale = isLoading && state.rate !== null
  const action = state.kind === 'online' || state.kind === 'loading' ? '更新' : '再試行'

  return <section className={`rate-status rate-status--${state.kind}`} aria-live="polite">
    {isStale ? <p>保存済みレート・最新ではありません</p> : null}
    {state.kind === 'unavailable' ? <p>通信状態を確認して再試行してください</p> : null}
    <div className="rate-copy">
      {state.rate ? <div className="rate-details"><span>1 USD = ¥{formatRate(state.rate.rate)}</span><span>本日基準</span><span>Frankfurter</span><span>{fetchedTime(state.rate.fetchedAt)}</span></div> : null}
      <p className="rate-notice">※ このレートは日次の参考レートであり、取引価格ではありません。</p>
    </div>
    <button type="button" className="refresh-button" aria-label="為替レートを更新" disabled={isLoading} onClick={() => void refresh()}>{action}</button>
  </section>
}
