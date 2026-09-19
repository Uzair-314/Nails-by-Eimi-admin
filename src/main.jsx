import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ConfigNotice from './components/ConfigNotice'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { SUPABASE_CONFIGURED } from './lib/supabase'
import './index.css'

// Without the database there is nothing to administer, so say so plainly rather
// than mounting a panel that will fail on its first query.
const root = createRoot(document.getElementById('root'))

root.render(
  <StrictMode>
    {SUPABASE_CONFIGURED ? (
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <ConfigNotice />
    )}
  </StrictMode>
)
