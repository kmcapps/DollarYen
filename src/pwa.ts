import { registerSW } from 'virtual:pwa-register'

export function registerDollarYenServiceWorker(): void {
  registerSW({ immediate: true })
}
