import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {AuthProvider} from './lib/AuthContext.tsx';
import {Toaster} from 'sonner';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Toaster theme="dark" position="bottom-right" expand={false} richColors />
      <App />
    </AuthProvider>
  </StrictMode>,
);
