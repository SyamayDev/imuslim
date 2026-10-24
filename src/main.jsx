// Migrasi data versi lama harus berjalan sebelum store dibaca.
import './app/normalize-url.js';
import './app/migrate-legacy.js';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/fraunces/600.css';
// Hanya subset Arab: spasi/angka di teks Arab tidak memicu unduhan subset Latin.
import '@fontsource/amiri-quran/arabic-400.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';

import App from './app/App.jsx';
import { registerServiceWorker } from './app/sw-register.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
