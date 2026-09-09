import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './styles/global.css';
import '@/services/recipes.service.js'; // efeitos de recálculo de fichas
import '@/services/inventory.service.js'; // saldo inicial ao criar ingrediente

registerSW({
  immediate: true,
  onOfflineReady() {
    // App pronto para uso offline (cache de assets).
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
