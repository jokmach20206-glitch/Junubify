import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import JunubifyEnhancements from './enhancements.jsx';
import ProductionReadiness from './production.jsx';
import './styles.css';
import './mobile.css';
import './search-enhancements.css';
import './professional-search.css';
import './enhancements.css';
import './trending-offline.css';
import './mobile-compat.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // Keep diagnostics in the browser console without exposing implementation details to listeners.
    console.error('Junubify render error:', error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="app-recovery" role="alert">
          <h1>Junubify couldn’t load this page.</h1>
          <p>Try reloading. If the problem continues, check your connection and try again later.</p>
          <button type="button" onClick={() => window.location.reload()}>Reload Junubify</button>
        </main>
      );
    }
    return this.props.children;
  }
}

if (window.__junubifyStartupTimer) {
  window.clearTimeout(window.__junubifyStartupTimer);
  window.__junubifyStartupTimer = null;
}

let container = document.getElementById('root');
if (!container) {
  container = document.createElement('div');
  container.id = 'root';
  document.body.appendChild(container);
}

createRoot(container).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <>
        <App />
        <JunubifyEnhancements />
        <ProductionReadiness />
      </>
    </AppErrorBoundary>
  </React.StrictMode>,
);

document.getElementById('startup-status')?.remove();
