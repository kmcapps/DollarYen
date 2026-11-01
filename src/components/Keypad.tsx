import { useEffect } from 'react'
import type { Digit } from '../domain/amountInput'
import type { CalculatorAction } from '../domain/addition'

type KeypadProps = { onAction: (action: CalculatorAction) => void }

const digitKeys: Digit[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

function actionForKey(key: string): CalculatorAction | null {
  if (/^[0-9]$/.test(key)) return { type: 'digit', digit: key as Digit }
  if (key === '.') return { type: 'decimal' }
  if (key === '+') return { type: 'add' }
  if (key === '=' || key === 'Enter') return { type: 'equals' }
  if (key === 'Backspace' || key === 'Delete') return { type: 'backspace' }
  if (key === 'Escape' || key.toLowerCase() === 'c') return { type: 'clear' }
  return null
}

export function Keypad({ onAction }: KeypadProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      // Preserve native keyboard activation when navigating buttons with Tab.
      if (event.key === 'Enter' && event.target instanceof HTMLElement && event.target.closest('button')) return
      const action = actionForKey(event.key)
      if (!action) return
      event.preventDefault()
      onAction(action)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onAction])

  return <section className="keypad" aria-label="金額キーパッド">
    {digitKeys.slice(0, 3).map((digit) => <button key={digit} type="button" onClick={() => onAction({ type: 'digit', digit })}>{digit}</button>)}
    <button type="button" aria-label="1文字削除" onClick={() => onAction({ type: 'backspace' })}><span aria-hidden="true">⌫</span></button>
    {digitKeys.slice(3, 6).map((digit) => <button key={digit} type="button" onClick={() => onAction({ type: 'digit', digit })}>{digit}</button>)}
    <button className="clear-key" type="button" aria-label="クリア" onClick={() => onAction({ type: 'clear' })}>C</button>
    {digitKeys.slice(6).map((digit) => <button key={digit} type="button" onClick={() => onAction({ type: 'digit', digit })}>{digit}</button>)}
    <button className="add-key" type="button" aria-label="足す" onClick={() => onAction({ type: 'add' })}>＋</button>
    <button className="zero-key" type="button" onClick={() => onAction({ type: 'digit', digit: '0' })}>0</button>
    <button type="button" aria-label="小数点" onClick={() => onAction({ type: 'decimal' })}>.</button>
    <button className="equals-key" type="button" aria-label="合計" onClick={() => onAction({ type: 'equals' })}>＝</button>
  </section>
}
