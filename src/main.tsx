import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { registerDollarYenServiceWorker } from './pwa'
import './styles.css'

registerDollarYenServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
