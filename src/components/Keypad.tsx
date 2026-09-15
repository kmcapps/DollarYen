import { useEffect } from 'react'
import type { AmountAction, Digit } from '../domain/amountInput'

type KeypadProps = { onAction: (action: AmountAction) => void }

const digitKeys: Digit[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

function actionForKey(key: string): AmountAction | null {
  if (/^[0-9]$/.test(key)) return { type: 'digit', digit: key as Digit }
  if (key === '.') return { type: 'decimal' }
  if (key === 'Backspace' || key === 'Delete') return { type: 'backspace' }
  if (key === 'Escape' || key.toLowerCase() === 'c') return { type: 'clear' }
  return null
}

export function Keypad({ onAction }: KeypadProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
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
    <button type="button" aria-label="小数点" onClick={() => onAction({ type: 'decimal' })}>.</button>
    <button className="zero-key" type="button" onClick={() => onAction({ type: 'digit', digit: '0' })}>0</button>
  </section>
}
