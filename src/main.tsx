import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'leaflet/dist/leaflet.css';
import './index.css';
import { useProjectStore } from './store/useProjectStore';

// Expose store for testing purposes
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore
  window.useProjectStore = useProjectStore;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
