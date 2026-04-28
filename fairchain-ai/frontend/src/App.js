import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Navbar       from './components/layout/Navbar';
import Landing      from './pages/Landing';
import Dashboard    from './pages/Dashboard';
import NewAudit     from './pages/NewAudit';
import AuditResults from './pages/AuditResults';
import Report       from './pages/Report';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight:'100vh', background:'#0a0a0a', color:'#f0ede8' }}>
        <Navbar />
        <Routes>
          <Route path="/"              element={<Landing />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/audit/new"     element={<NewAudit />} />
          <Route path="/audit/:id"     element={<AuditResults />} />
          <Route path="/report/:id"    element={<Report />} />
          <Route path="*"              element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}