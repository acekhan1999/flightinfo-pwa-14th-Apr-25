import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Workbox service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('https://acekhan1999.github.io/flightinfo-pwa-14th-Apr-25/custom-sw.js')
      .then(reg => {
        console.log('Custom SW registered:', reg);
      })
      .catch(err => {
        console.error('Custom SW registration failed:', err);
      });
  });
}

reportWebVitals();
