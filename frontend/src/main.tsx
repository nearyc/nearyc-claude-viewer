import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { I18nProvider } from './contexts/I18nContext.tsx'
import { MobileProvider } from './contexts/MobileContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <MobileProvider>
          <App />
        </MobileProvider>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
