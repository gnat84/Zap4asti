// Polyfill globalThis for older iOS Safari (iOS < 12.2)
if (typeof globalThis === 'undefined') {
  // @ts-expect-error fallback for legacy WebKit
  window.globalThis = window
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
