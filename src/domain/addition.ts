import { formatUsdInput, reduceAmount, type AmountAction } from './amountInput'

export type CalculatorAction = AmountAction | { type: 'add' } | { type: 'equals' }

interface CalculatorState {
  entry: string
  subtotalCents: number | null
  phase: 'entry' | 'adding' | 'result'
  completedExpression: string | null
  error: string | null
}

export const initialCalculatorState: CalculatorState = {
  entry: '0', subtotalCents: null, phase: 'entry', completedExpression: null, error: null,
}

const MAX_TOTAL_CENTS = 99_999_999_999_999

// Split the decimal string before arithmetic so 0.1 + 0.2 is exactly 30 cents.
function toCents(amount: string): number {
  const [integer, fraction = ''] = amount.split('.')
  return Number(integer) * 100 + Number(fraction.padEnd(2, '0'))
}

function fromCents(cents: number): string {
  const integer = Math.floor(cents / 100)
  const fraction = cents % 100
  return fraction === 0 ? String(integer) : `${integer}.${String(fraction).padStart(2, '0').replace(/0$/, '')}`
}

function totalCents(state: CalculatorState): number {
  if (state.subtotalCents === null) return toCents(state.entry)
  return state.subtotalCents + (state.phase === 'adding' ? 0 : toCents(state.entry))
}

export function getCalculatorDisplay(state: CalculatorState) {
  const expression = state.subtotalCents === null
    ? state.completedExpression
    : `${formatUsdInput(fromCents(state.subtotalCents))} +${state.phase === 'entry' ? ` ${formatUsdInput(state.entry)}` : ''}`

  return {
    amount: state.subtotalCents === null ? state.entry : fromCents(totalCents(state)),
    expression,
    error: state.error,
  }
}

export function reduceCalculator(state: CalculatorState, action: CalculatorAction): CalculatorState {
  if (action.type === 'clear') return initialCalculatorState

  if (action.type === 'add') {
    if (state.phase === 'adding') return state
    const total = totalCents(state)
    return { entry: fromCents(total), subtotalCents: total, phase: 'adding', completedExpression: null, error: null }
  }

  if (action.type === 'equals') {
    if (state.phase === 'result') return state
    const expression = state.subtotalCents !== null && state.phase === 'entry'
      ? `${getCalculatorDisplay(state).expression} =` : null
    return { entry: fromCents(totalCents(state)), subtotalCents: null, phase: 'result', completedExpression: expression, error: null }
  }

  if (action.type === 'backspace' && state.phase === 'adding') {
    return { ...initialCalculatorState, entry: state.entry }
  }

  const startsFresh = state.phase === 'result' && action.type !== 'backspace'
  const base = startsFresh ? initialCalculatorState : state
  const currentEntry = base.phase === 'adding' ? '0' : base.entry
  const nextEntry = reduceAmount(currentEntry, action).value

  if ((base.subtotalCents ?? 0) + toCents(nextEntry) > MAX_TOTAL_CENTS) {
    return { ...state, error: '合計は999,999,999,999.99 USDまでです' }
  }

  return { ...base, entry: nextEntry, phase: 'entry', completedExpression: null, error: null }
}
