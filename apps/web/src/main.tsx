import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { installAudioUnlock } from './audio/audioUnlock';
import './fonts.css';
import './index.css';
import { registerPwa } from './pwa/register';
import { applyPreferences } from './settings/preferences';
import { rememberAppVersion } from './version';

applyPreferences();
installAudioUnlock();
rememberAppVersion();

// Start the service-worker update check before React renders. A child who
// launches the PWA and stops on the home screen must still receive the new
// build without opening the level map first.
registerPwa();

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
