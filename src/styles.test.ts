import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
const mobileStyles = styles.slice(styles.indexOf('@media (max-width: 639px)'), styles.indexOf('@media (min-width: 640px)'))

test('keeps the mobile keypad in normal layout flow instead of absorbing viewport height', () => {
  expect(mobileStyles).toContain('.calculator-card { display: grid;')
  expect(mobileStyles).toContain('align-content: start;')
  expect(mobileStyles).not.toContain('margin-top: auto')
})
