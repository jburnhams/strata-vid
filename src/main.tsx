import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { StrataQueryProvider, StrataToastRegion, ThemeProvider } from 'strata-react';
import App from './App';
import '@fontsource-variable/overpass';
import '@fontsource-variable/overpass-mono';
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

if (isStrictMode) {
  console.log('[Strata Vid] Strict Mode: Enabled');
} else {
  console.log('[Strata Vid] Strict Mode: Disabled');
}

const Root = isStrictMode ? React.StrictMode : React.Fragment;

// One screen, but the router is part of strata-react's stack: panes and open items will move
// into the URL as the editor's state does.
const router = createBrowserRouter([{ path: '*', element: <App /> }]);

// Dark by default: an editor judges footage against a dark surround (see theme.css).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <Root>
    <ThemeProvider defaultPreference="dark">
      <StrataQueryProvider>
        <RouterProvider router={router} />
        <StrataToastRegion />
      </StrataQueryProvider>
    </ThemeProvider>
  </Root>,
);
