import { createContext, useContext, useState, useCallback } from 'react';

// Create context with a safe default so mis-use throws a clear error
const AuditContext = createContext(undefined);

export function AuditProvider({ children }) {
  const [audits, setAudits] = useState([]);

  const addAudit = useCallback((result) => {
    if (!result?.domain_id) return;
    setAudits(prev => {
      const id = result.audit_id
        ?? `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      // Prevent duplicate entries
      if (prev.some(a => a.id === id)) return prev;
      return [
        { ...result, id, timestamp: result.timestamp ?? new Date().toISOString() },
        ...prev,
      ];
    });
  }, []);

  const removeAudit = useCallback((id) => {
    setAudits(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearAudits = useCallback(() => setAudits([]), []);

  return (
    <AuditContext.Provider value={{ audits, addAudit, removeAudit, clearAudits }}>
      {children}
    </AuditContext.Provider>
  );
}

// Named export — import { useAudits } from '../context/AuditContext'
export function useAudits() {
  const ctx = useContext(AuditContext);
  if (ctx === undefined) {
    throw new Error('useAudits must be used inside <AuditProvider>');
  }
  return ctx;
}