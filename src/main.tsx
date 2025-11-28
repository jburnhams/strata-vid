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

// Check for strict mode override via query param (default: enabled)
const searchParams = new URLSearchParams(window.location.search);
const strictModeParam = searchParams.get('strict');
const isStrictMode = strictModeParam !== 'false';

const Root = isStrictMode ? React.StrictMode : React.Fragment;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Root>
    <App />
  </Root>,
);
