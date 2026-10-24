import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './fonts.css';
import './index.css';
import { registerPwa } from './pwa/register';
import { applyPreferences } from './settings/preferences';

applyPreferences();

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerPwa();
