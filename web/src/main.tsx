import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toaster';
import App from './App';
import './index.css';
import { LANDING_CSS } from './pages/landing/styles';

// Injecté une seule fois — jamais retiré — styles scopés .lp n'affectent pas les autres pages
const _s = document.createElement('style');
_s.setAttribute('data-id', 'landing-css');
_s.textContent = LANDING_CSS;
document.head.appendChild(_s);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
