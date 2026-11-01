import { describe, expect, it } from 'vitest'
import { getCalculatorDisplay, initialCalculatorState, reduceCalculator, type CalculatorAction } from './addition'
import type { Digit } from './amountInput'

// Simulate the public calculator actions; all expectations are hand-calculated.
function calculate(keys: string) {
  let state = initialCalculatorState
  for (const key of keys) {
    let action: CalculatorAction
    if (key === '+') action = { type: 'add' }
    else if (key === '=') action = { type: 'equals' }
    else if (key === '.') action = { type: 'decimal' }
    else if (key === 'C') action = { type: 'clear' }
    else if (key === '<') action = { type: 'backspace' }
    else action = { type: 'digit', digit: key as Digit }
    state = reduceCalculator(state, action)
  }
  return getCalculatorDisplay(state)
}

describe('USD addition', () => {
  it.each([
    ['10+20', '30'],
    ['10+20+5=', '35'],
    ['0.1+0.2=', '0.3'],
    ['0.01+0.02+0.03=', '0.06'],
    ['999999999999.98+0.01=', '999999999999.99'],
    ['10++20===', '30'],
    ['10+=', '10'],
    ['10+20=5', '5'],
    ['10+20=.5', '0.5'],
    ['10+20=+5=', '35'],
    ['10+25<', '12'],
    ['10+20+<3', '303'],
    ['10+20=<', '3'],
    ['10+25C3', '3'],
    ['10+0.', '10'],
    ['12.345', '12.34'],
    ['1234567890123', '123456789012'],
  ])('%s displays %s USD', (keys, amount) => {
    expect(calculate(keys).amount).toBe(amount)
  })

  it('preserves the trailing decimal in the current operand', () => {
    expect(calculate('10+0.').expression).toBe('10 + 0.')
    expect(calculate('10+20=').expression).toBe('10 + 20 =')
  })

  it('keeps the subtotal visible while awaiting the next operand', () => {
    expect(calculate('10+20+')).toEqual({ amount: '30', expression: '30 +', error: null })
  })

  it('rejects total overflow while preserving the operand for correction', () => {
    expect(calculate('999999999999.98+0.02')).toEqual({
      amount: '999999999999.98', expression: '999,999,999,999.98 + 0.0',
      error: '合計は999,999,999,999.99 USDまでです',
    })
    expect(calculate('999999999999.98+0.021=')).toEqual({
      amount: '999999999999.99', expression: '999,999,999,999.98 + 0.01 =', error: null,
    })
  })

  it('allows clearing or removing a pending plus after reaching the maximum', () => {
    expect(calculate('999999999999.99+1C')).toEqual({ amount: '0', expression: null, error: null })
    expect(calculate('999999999999.99+<')).toEqual({ amount: '999999999999.99', expression: null, error: null })
  })
})
