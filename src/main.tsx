import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { emitServiceWorkerUpdateReady } from './lib/pwaEvents.ts';
import './index.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        const announceUpdate = () => {
          if (registration.waiting) {
            emitServiceWorkerUpdateReady(registration);
          }
        };

        announceUpdate();

        registration.addEventListener('updatefound', () => {
          const nextWorker = registration.installing;
          if (!nextWorker) return;

          nextWorker.addEventListener('statechange', () => {
            if (nextWorker.state === 'installed' && navigator.serviceWorker.controller) {
              announceUpdate();
            }
          });
        });

        window.setInterval(() => {
          void registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error('Failed to register service worker.', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
