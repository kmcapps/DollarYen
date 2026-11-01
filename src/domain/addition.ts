import { formatUsdInput, reduceAmount, type AmountAction } from './amountInput'

type Operation = 'add' | 'subtract'
export type CalculatorAction = AmountAction | { type: 'add' } | { type: 'subtract' } | { type: 'equals' }

interface CalculatorState {
  entry: string
  subtotalCents: number | null
  phase: 'entry' | 'operator' | 'result'
  operation: Operation
  expressionPrefix: string
  completedExpression: string | null
  error: string | null
}

export const initialCalculatorState: CalculatorState = {
  entry: '0', subtotalCents: null, phase: 'entry', operation: 'add', expressionPrefix: '', completedExpression: null, error: null,
}

const MAX_TOTAL_CENTS = 99_999_999_999_999

// Split the decimal string before arithmetic so 0.1 + 0.2 is exactly 30 cents.
function toCents(amount: string): number {
  const negative = amount.startsWith('-')
  const [integer, fraction = ''] = (negative ? amount.slice(1) : amount).split('.')
  const cents = Number(integer) * 100 + Number(fraction.padEnd(2, '0'))
  return negative ? -cents : cents
}

function fromCents(cents: number): string {
  const absolute = Math.abs(cents)
  const integer = Math.floor(absolute / 100)
  const fraction = absolute % 100
  const amount = fraction === 0 ? String(integer) : `${integer}.${String(fraction).padStart(2, '0').replace(/0$/, '')}`
  return cents < 0 ? `-${amount}` : amount
}

function formatSignedAmount(amount: string): string {
  return amount.startsWith('-') ? `-${formatUsdInput(amount.slice(1))}` : formatUsdInput(amount)
}

function totalCents(state: CalculatorState): number {
  if (state.subtotalCents === null) return toCents(state.entry)
  if (state.phase === 'operator') return state.subtotalCents
  const operand = toCents(state.entry)
  return state.operation === 'subtract' ? state.subtotalCents - operand : state.subtotalCents + operand
}

export function getCalculatorDisplay(state: CalculatorState) {
  const expression = state.subtotalCents === null
    ? state.completedExpression
    : `${state.expressionPrefix} ${state.operation === 'subtract' ? '-' : '+'}${state.phase === 'entry' ? ` ${formatSignedAmount(state.entry)}` : ''}`

  return {
    amount: state.subtotalCents === null ? state.entry : fromCents(totalCents(state)),
    expression,
    error: state.error,
  }
}

export function reduceCalculator(state: CalculatorState, action: CalculatorAction): CalculatorState {
  if (action.type === 'clear') return initialCalculatorState

  if (action.type === 'add' || action.type === 'subtract') {
    if (state.phase === 'operator') return { ...state, operation: action.type, error: null }
    const total = totalCents(state)
    const expressionPrefix = state.subtotalCents === null
      ? formatSignedAmount(state.entry)
      : getCalculatorDisplay(state).expression!
    return { entry: fromCents(total), subtotalCents: total, phase: 'operator', operation: action.type, expressionPrefix, completedExpression: null, error: null }
  }

  if (action.type === 'equals') {
    if (state.phase === 'result') return state
    const expression = state.subtotalCents !== null && state.phase === 'entry'
      ? `${getCalculatorDisplay(state).expression} =` : null
    return { ...initialCalculatorState, entry: fromCents(totalCents(state)), phase: 'result', completedExpression: expression }
  }

  if (action.type === 'backspace' && state.phase === 'operator') {
    return { ...initialCalculatorState, entry: state.entry }
  }

  const startsFresh = state.phase === 'result' && action.type !== 'backspace'
  const base = startsFresh ? initialCalculatorState : state
  const currentEntry = base.phase === 'operator' ? '0' : base.entry
  const negative = currentEntry.startsWith('-')
  const reduced = reduceAmount(negative ? currentEntry.slice(1) : currentEntry, action).value
  const nextEntry = negative && reduced !== '0' ? `-${reduced}` : reduced
  const nextState: CalculatorState = { ...base, entry: nextEntry, phase: 'entry', completedExpression: null, error: null }

  if (Math.abs(totalCents(nextState)) > MAX_TOTAL_CENTS) {
    return { ...state, error: '合計は±999,999,999,999.99 USDまでです' }
  }

  return nextState
}
