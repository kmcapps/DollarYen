import { beforeEach, expect, test, vi } from 'vitest'
import { registerDollarYenServiceWorker } from './pwa'

const pwaMocks = vi.hoisted(() => ({
  registerSW: vi.fn(() => vi.fn()),
}))

vi.mock('virtual:pwa-register', () => ({
  registerSW: pwaMocks.registerSW,
}))

beforeEach(() => {
  pwaMocks.registerSW.mockClear()
})

test('registers the service worker without an in-session update or reload callback', () => {
  registerDollarYenServiceWorker()

  expect(pwaMocks.registerSW).toHaveBeenCalledOnce()
  expect(pwaMocks.registerSW).toHaveBeenCalledWith({ immediate: true })
})
