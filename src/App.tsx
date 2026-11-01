import { useReducer } from 'react'
import { AmountDisplay } from './components/AmountDisplay'
import { Keypad } from './components/Keypad'
import { RateStatus, RateSummary } from './components/RateStatus'
import { getCalculatorDisplay, initialCalculatorState, reduceCalculator } from './domain/addition'
import { useExchangeRate, type ExchangeRateController } from './hooks/useExchangeRate'

export function AppView({ rateController }: { rateController: ExchangeRateController }) {
  const [calculator, dispatch] = useReducer(reduceCalculator, initialCalculatorState)
  const display = getCalculatorDisplay(calculator)

  return <main className="app-shell">
    <section className="calculator-card" aria-labelledby="app-title">
      <AmountDisplay {...display} rate={rateController.state.rate} />
      <Keypad onAction={dispatch} />
      <header className="app-header" role="banner" aria-busy={rateController.state.kind === 'loading'}><h1 id="app-title">DollarYen</h1><RateSummary state={rateController.state} /></header>
      <RateStatus state={rateController.state} refresh={rateController.refresh} />
    </section>
  </main>
}

function App() {
  const rateController = useExchangeRate()
  return <AppView rateController={rateController} />
}

export default App
