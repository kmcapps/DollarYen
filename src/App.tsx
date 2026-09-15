import { useCallback, useReducer } from 'react'
import { AmountDisplay } from './components/AmountDisplay'
import { Keypad } from './components/Keypad'
import { RateStatus, RateSummary } from './components/RateStatus'
import { reduceAmount, type AmountAction } from './domain/amountInput'
import { useExchangeRate, type ExchangeRateController } from './hooks/useExchangeRate'

type AmountState = { amount: string }
const initialAmountState: AmountState = { amount: '0' }

function amountReducer(state: AmountState, action: AmountAction): AmountState {
  return { amount: reduceAmount(state.amount, action).value }
}

export function AppView({ rateController }: { rateController: ExchangeRateController }) {
  const [amountState, dispatch] = useReducer(amountReducer, initialAmountState)
  const handleAction = useCallback((action: AmountAction) => {
    dispatch(action)
  }, [])

  return <main className="app-shell">
    <section className="calculator-card" aria-labelledby="app-title">
      <header className="app-header" role="banner" aria-busy={rateController.state.kind === 'loading'}><h1 id="app-title">DollarYen</h1><RateSummary state={rateController.state} /></header>
      <AmountDisplay amount={amountState.amount} rate={rateController.state.rate} />
      <RateStatus state={rateController.state} refresh={rateController.refresh} />
      <Keypad onAction={handleAction} />
    </section>
  </main>
}

function App() {
  const rateController = useExchangeRate()
  return <AppView rateController={rateController} />
}

export default App
