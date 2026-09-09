import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import '@/services/recipes.service.js'; // efeitos de recálculo de fichas
import '@/services/inventory.service.js'; // saldo inicial ao criar ingrediente

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
