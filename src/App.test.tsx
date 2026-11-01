import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import type { ExchangeRateController } from './hooks/useExchangeRate'
import { AppView } from './App'

const rate = { rate: 150.25, rateDate: '2026-09-14', fetchedAt: '2026-09-14T15:42:00.000Z', source: 'Frankfurter' as const }
function controller(state: ExchangeRateController['state'], refresh = vi.fn().mockResolvedValue(undefined)) { return { state, refresh } }

test('renders a non-editable calculator with every required key', () => {
  render(<AppView rateController={controller({ kind: 'online', rate })} />)
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  for (const name of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '1文字削除', 'クリア', '小数点']) expect(screen.getByRole('button', { name })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 1, name: 'DollarYen' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'クリア' })).toHaveClass('clear-key')
  expect(screen.getByRole('banner')).toHaveClass('app-header')
  expect(screen.queryByRole('status', { name: '入力のお知らせ' })).not.toBeInTheDocument()
})

test('updates both currency outputs synchronously for the 123.45 sequence', async () => {
  const user = userEvent.setup(); render(<AppView rateController={controller({ kind: 'online', rate })} />)
  for (const key of ['1', '2', '3', '小数点', '4', '5']) await user.click(screen.getByRole('button', { name: key }))
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$123.45')
  expect(screen.getByLabelText('日本円金額')).toHaveTextContent('¥18,548')
})

test('keeps the amount for a second decimal', async () => {
  const user = userEvent.setup(); render(<AppView rateController={controller({ kind: 'online', rate })} />)
  await user.click(screen.getByRole('button', { name: '1' })); await user.click(screen.getByRole('button', { name: '小数点' })); await user.click(screen.getByRole('button', { name: '小数点' }))
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$1.')
})

test('backspace and clear restore the displayed amount', async () => {
  const user = userEvent.setup(); render(<AppView rateController={controller({ kind: 'online', rate })} />)
  await user.click(screen.getByRole('button', { name: '1' })); await user.click(screen.getByRole('button', { name: '2' })); await user.click(screen.getByRole('button', { name: '1文字削除' }))
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$1')
  await user.click(screen.getByRole('button', { name: 'クリア' })); expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$0')
})

test('rejects excessive integer and fraction digits', async () => {
  const user = userEvent.setup(); render(<AppView rateController={controller({ kind: 'online', rate })} />)
  await user.keyboard('1234567890123'); expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$123,456,789,012')
  await user.keyboard('.456'); expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$123,456,789,012.45')
})

test('supports keyboard digits, decimal, deletion, clear, and ignores unrelated keys', async () => {
  const user = userEvent.setup(); render(<AppView rateController={controller({ kind: 'online', rate })} />)
  await user.keyboard('12.3'); await user.keyboard('{Backspace}'); expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$12.')
  await user.keyboard('{Delete}'); expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$12')
  await user.keyboard('{Escape}'); expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$0')
  await user.keyboard('7c'); expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$0')
  await user.keyboard('x'); expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$0')
})

test.each([
  ['online', { kind: 'online', rate } as const, 'オンライン取得済み', '更新'],
  ['cached', { kind: 'cached', rate } as const, '保存済みレート・最新ではありません', '再試行'],
  ['loading with cached rate', { kind: 'loading', rate } as const, '保存済みレートを表示中・更新確認中', '更新'],
  ['unavailable', { kind: 'unavailable', rate: null } as const, 'レートを取得できません', '再試行'],
])('shows the %s rate state and action', (_name, state, copy, action) => {
  render(<AppView rateController={controller(state)} />); expect(screen.getByText(copy)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '為替レートを更新' })).toHaveTextContent(action)
})

test('keeps JPY blank and disables refresh while loading without a cached rate', () => {
  render(<AppView rateController={controller({ kind: 'loading', rate: null })} />)
  expect(screen.getByLabelText('日本円金額')).toHaveTextContent('—'); expect(screen.getByRole('button', { name: '為替レートを更新' })).toBeDisabled()
})

test('keeps the keypad usable while loading with cache', async () => {
  const user = userEvent.setup(); render(<AppView rateController={controller({ kind: 'loading', rate })} />)
  await user.click(screen.getByRole('button', { name: '1' })); expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$1')
})

test('invokes refresh from an available rate state', async () => {
  const user = userEvent.setup(); const refresh = vi.fn().mockResolvedValue(undefined); render(<AppView rateController={controller({ kind: 'online', rate }, refresh)} />)
  await user.click(screen.getByRole('button', { name: '為替レートを更新' })); expect(refresh).toHaveBeenCalledOnce()
})

test('shows rate provenance and the daily-reference notice whenever a rate exists', () => {
  render(<AppView rateController={controller({ kind: 'online', rate })} />)
  expect(screen.getByText('本日基準')).toBeInTheDocument(); expect(screen.getByText('Frankfurter')).toBeInTheDocument()
  expect(screen.getByText(/^取得 \d{2}:\d{2}$/)).toBeInTheDocument(); expect(screen.getByText('※ このレートは日次の参考レートであり、取引価格ではありません。')).toBeInTheDocument()
})

test('uses only approved state copy and rate formats', () => {
  render(<AppView rateController={controller({ kind: 'online', rate })} />)
  expect(screen.getByText('1 USD = ¥150.25')).toBeInTheDocument()
  expect(screen.getByText('本日基準')).toBeInTheDocument()
  for (const disallowed of ['レートを確認中', 'USD / JPY', '米ドルを日本円に換算', '米ドル', '日本円']) expect(screen.queryByText(disallowed)).not.toBeInTheDocument()
})

test('formats a one-decimal API rate with two visible decimal places', () => {
  render(<AppView rateController={controller({ kind: 'online', rate: { ...rate, rate: 150.2 } })} />)

  expect(screen.getByText('1 USD = ¥150.20')).toBeInTheDocument()
})

test('places the refresh button before the daily-reference notice', () => {
  render(<AppView rateController={controller({ kind: 'online', rate })} />)
  const notice = screen.getByText('※ このレートは日次の参考レートであり、取引価格ではありません。')
  const refresh = screen.getByRole('button', { name: '為替レートを更新' })

  expect(refresh.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(notice.closest('.rate-copy')).not.toBeNull()
  expect(refresh.closest('.rate-copy')).toBeNull()
})

test('shows a bare dash for JPY when no rate exists', () => {
  render(<AppView rateController={controller({ kind: 'unavailable', rate: null })} />)
  expect(screen.getByLabelText('日本円金額')).toHaveTextContent('—')
  expect(screen.getByLabelText('日本円金額')).not.toHaveTextContent('¥')
})

test('does not capture modified keyboard clear shortcuts', async () => {
  const user = userEvent.setup(); render(<AppView rateController={controller({ kind: 'online', rate })} />)
  await user.keyboard('12'); await user.keyboard('{Control>}c{/Control}')
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$12')
})

test('does not expose an unapproved visible loading label when no rate exists', () => {
  render(<AppView rateController={controller({ kind: 'loading', rate: null })} />)
  expect(screen.queryByText('レートを取得中')).not.toBeInTheDocument()
  expect(screen.getByRole('banner')).toHaveAttribute('aria-busy', 'true')
})

test('shows symbol-only amounts followed by the keypad and rate details', () => {
  render(<AppView rateController={controller({ kind: 'online', rate })} />)
  const header = screen.getByRole('banner')
  expect(header).toHaveTextContent('DollarYen')
  expect(header).toHaveTextContent('オンライン取得済み')
  const usd = screen.getByLabelText('米ドル金額')
  const jpy = screen.getByLabelText('日本円金額')
  const rateDetails = screen.getByText('1 USD = ¥150.25')
  const keypad = screen.getByLabelText('金額キーパッド')
  expect(usd.compareDocumentPosition(jpy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(jpy.compareDocumentPosition(keypad) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(keypad.compareDocumentPosition(rateDetails) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.queryByText('USD', { exact: true })).not.toBeInTheDocument()
  expect(screen.queryByText('JPY', { exact: true })).not.toBeInTheDocument()
  expect(usd).toHaveTextContent('$0')
  expect(jpy).toHaveTextContent('¥0')
})

test.each([
  ['cached', { kind: 'cached', rate } as const, '保存済みレート・最新ではありません'],
  ['unavailable', { kind: 'unavailable', rate: null } as const, 'レートを取得できません'],
])('keeps the %s banner live and exposes its semantic state class', (kind, state, copy) => {
  render(<AppView rateController={controller(state)} />)
  const summary = screen.getByText(copy)
  expect(summary).toHaveAttribute('aria-live', 'polite')
  expect(summary).toHaveClass(`rate-summary--${kind}`)
})

test('converts the live USD sum before equals and supports continued addition', async () => {
  const user = userEvent.setup()
  render(<AppView rateController={controller({ kind: 'online', rate })} />)
  await user.keyboard('10+20')
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$30')
  expect(screen.getByLabelText('日本円金額')).toHaveTextContent('¥4,508')
  expect(screen.getByLabelText('米ドルの計算式')).toHaveTextContent('10 + 20')
  await user.keyboard('+5{Enter}')
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$35')
  expect(screen.getByLabelText('日本円金額')).toHaveTextContent('¥5,259')
})

test('adds amounts using the on-screen plus and equals controls', async () => {
  const user = userEvent.setup()
  render(<AppView rateController={controller({ kind: 'online', rate })} />)
  for (const key of ['1', '0', '足す', '2', '0', '合計']) {
    await user.click(screen.getByRole('button', { name: key }))
  }
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$30')
  expect(screen.getByLabelText('日本円金額')).toHaveTextContent('¥4,508')
})

test('starts fresh after equals but continues the total when plus is pressed', async () => {
  const user = userEvent.setup()
  render(<AppView rateController={controller({ kind: 'online', rate })} />)
  await user.keyboard('10+20=+5=')
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$35')
  await user.keyboard('.5')
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$0.5')
  expect(screen.getByLabelText('日本円金額')).toHaveTextContent('¥75')
})

test('edits an operand, cancels a pending plus, and clears the whole calculation', async () => {
  const user = userEvent.setup()
  render(<AppView rateController={controller({ kind: 'online', rate })} />)
  await user.keyboard('10+25{Backspace}')
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$12')
  await user.keyboard('+{Backspace}3')
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$123')
  await user.click(screen.getByRole('button', { name: 'クリア' }))
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$0')
  expect(screen.queryByLabelText('米ドルの計算式')).not.toBeInTheDocument()
  await user.keyboard('5')
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$5')
})

test('keeps addition available without a rate and converts it when a rate arrives', async () => {
  const user = userEvent.setup()
  const view = render(<AppView rateController={controller({ kind: 'unavailable', rate: null })} />)
  await user.keyboard('10+20')
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$30')
  expect(screen.getByLabelText('日本円金額')).toHaveTextContent('—')
  view.rerender(<AppView rateController={controller({ kind: 'online', rate })} />)
  expect(screen.getByLabelText('日本円金額')).toHaveTextContent('¥4,508')
})

test('explains total overflow and allows correcting the current operand', async () => {
  const user = userEvent.setup()
  render(<AppView rateController={controller({ kind: 'online', rate })} />)
  await user.keyboard('999999999999.98+0.02')
  expect(screen.getByRole('status', { name: '入力のお知らせ' })).toHaveTextContent('合計は999,999,999,999.99 USDまでです')
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$999,999,999,999.98')
  await user.keyboard('1=')
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$999,999,999,999.99')
  expect(screen.queryByRole('status', { name: '入力のお知らせ' })).not.toBeInTheDocument()
})

test('keeps native Enter activation for the focused rate refresh button', async () => {
  const user = userEvent.setup()
  const refresh = vi.fn().mockResolvedValue(undefined)
  render(<AppView rateController={controller({ kind: 'online', rate }, refresh)} />)
  await user.keyboard('10+20')
  await user.tab()
  expect(screen.getByRole('button', { name: '1' })).toHaveFocus()
  screen.getByRole('button', { name: '為替レートを更新' }).focus()
  expect(screen.getByRole('button', { name: '為替レートを更新' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(refresh).toHaveBeenCalledOnce()
  expect(screen.getByLabelText('米ドルの計算式')).toHaveTextContent('10 + 20')
})

test('keeps native Enter activation for a focused keypad button', async () => {
  const user = userEvent.setup()
  render(<AppView rateController={controller({ kind: 'online', rate })} />)
  await user.keyboard('10+20')
  screen.getByRole('button', { name: 'クリア' }).focus()
  await user.keyboard('{Enter}')
  expect(screen.getByLabelText('米ドル金額')).toHaveTextContent('$0')
  expect(screen.queryByLabelText('米ドルの計算式')).not.toBeInTheDocument()
})
