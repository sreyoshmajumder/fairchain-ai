import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar      from './components/ui/Navbar';
import Dashboard   from './pages/Dashboard';
import NewAudit    from './pages/NewAudit';
import AuditResults from './pages/AuditResults';
import Report      from './pages/Report';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{
        minHeight: '100dvh',
        background: '#0f1117',
        color: '#e2e8f0',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}>
        <Navbar />
        <Routes>
          <Route path="/"              element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/audit/new"     element={<NewAudit />} />
          <Route path="/audit/results" element={<AuditResults />} />
          <Route path="/report"        element={<Report />} />
          <Route path="*"              element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}