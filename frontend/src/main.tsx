import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { I18nProvider } from './contexts/I18nContext.tsx'
import { MobileProvider } from './contexts/MobileContext.tsx'
import { ServerEventsProvider, SSEEventListeners } from './lib/sse'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <I18nProvider>
        <ServerEventsProvider url="/api/sse">
          <SSEEventListeners />
          <MobileProvider>
            <App />
          </MobileProvider>
        </ServerEventsProvider>
      </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>,
)
