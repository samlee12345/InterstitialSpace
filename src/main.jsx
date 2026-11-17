import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';

// The built site (GitHub Pages) uses #/ links so every page can be opened or
// shared directly. Local development keeps normal paths.
const Router = import.meta.env.PROD ? HashRouter : BrowserRouter;
import './styles/tokens.css';
import './styles/app.css';
import App from './App.jsx';
import { DemoProvider } from './state/DemoContext.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <DemoProvider>
        <App />
      </DemoProvider>
    </Router>
  </React.StrictMode>,
);
