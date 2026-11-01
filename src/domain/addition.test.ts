import { describe, expect, it } from 'vitest'
import { getCalculatorDisplay, initialCalculatorState, reduceCalculator, type CalculatorAction } from './addition'
import type { Digit } from './amountInput'

// Simulate the public calculator actions; all expectations are hand-calculated.
function calculate(keys: string) {
  let state = initialCalculatorState
  for (const key of keys) {
    let action: CalculatorAction
    if (key === '+') action = { type: 'add' }
    else if (key === '-') action = { type: 'subtract' }
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
    ['10-3', '7'],
    ['10-3-2=', '5'],
    ['10+5-3=', '12'],
    ['10-20+5=', '-5'],
    ['0.3-0.2=', '0.1'],
    ['0.1-0.2=', '-0.1'],
    ['0.1-0.1=', '0'],
    ['-5+2=', '-3'],
    ['10+-3=', '7'],
    ['10-+3=', '13'],
    ['10--3===', '7'],
    ['10-=', '10'],
    ['10-20=-5=', '-15'],
    ['10-20=5', '5'],
    ['10-25=<<', '0'],
    ['10-25=<2', '-12'],
    ['10-25-<2', '-152'],
    ['10-25<', '8'],
    ['0-999999999999.99=', '-999999999999.99'],
  ])('%s displays %s USD', (keys, amount) => {
    expect(calculate(keys).amount).toBe(amount)
  })

  it('preserves the trailing decimal in the current operand', () => {
    expect(calculate('10+0.').expression).toBe('10 + 0.')
    expect(calculate('10+20=').expression).toBe('10 + 20 =')
  })

  it('keeps the subtotal visible while awaiting the next operand', () => {
    expect(calculate('10+20+')).toEqual({ amount: '30', expression: '10 + 20 +', error: null })
  })

  it('rejects total overflow while preserving the operand for correction', () => {
    expect(calculate('999999999999.98+0.02')).toEqual({
      amount: '999999999999.98', expression: '999,999,999,999.98 + 0.0',
      error: '合計は±999,999,999,999.99 USDまでです',
    })
    expect(calculate('999999999999.98+0.021=')).toEqual({
      amount: '999999999999.99', expression: '999,999,999,999.98 + 0.01 =', error: null,
    })
  })

  it('allows clearing or removing a pending plus after reaching the maximum', () => {
    expect(calculate('999999999999.99+1C')).toEqual({ amount: '0', expression: null, error: null })
    expect(calculate('999999999999.99+<')).toEqual({ amount: '999999999999.99', expression: null, error: null })
  })

  it('formats a negative subtotal in the expression without losing its sign', () => {
    expect(calculate('10-20+5').expression).toBe('10 - 20 + 5')
    expect(calculate('10-20=').expression).toBe('10 - 20 =')
  })

  it('rejects negative overflow and allows correcting the operand', () => {
    expect(calculate('0-999999999999.99=-0.01').error).toBe('合計は±999,999,999,999.99 USDまでです')
    expect(calculate('0-999999999999.99=-0.01C5').amount).toBe('5')
  })

  it('keeps every entered term instead of replacing earlier terms with a subtotal', () => {
    expect(calculate('1+1+1')).toEqual({ amount: '3', expression: '1 + 1 + 1', error: null })
    expect(calculate('1+1+1-2')).toEqual({ amount: '1', expression: '1 + 1 + 1 - 2', error: null })
    expect(calculate('1+1+1-+2').expression).toBe('1 + 1 + 1 + 2')
    expect(calculate('1+1+1C2+3').expression).toBe('2 + 3')
  })
})
