import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuditProvider } from './context/AuditContext';
import GeminiChat from './components/ui/GeminiChat';
import { createPortal } from 'react-dom';

// ── Portal container for the chatbot ─────────────────────────────────────────
// pointer-events: none on the WRAPPER so it never blocks clicks on the page
// GeminiChat must set pointer-events: auto on its own root element
const chatDiv = document.createElement('div');
chatDiv.id = 'fairbot-root';
Object.assign(chatDiv.style, {
  position:      'fixed',
  bottom:        '0',
  right:         '0',
  zIndex:        '2147483647',
  pointerEvents: 'none',   // wrapper is passthrough
  width:         '0',
  height:        '0',
});
document.body.appendChild(chatDiv);

// ── Root — single React tree so AuditContext covers everything ────────────────
function Root() {
  return (
    <AuditProvider>
      <App />
      {createPortal(<GeminiChat />, chatDiv)}
    </AuditProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);