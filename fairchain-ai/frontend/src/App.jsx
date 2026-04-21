import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar   from './components/layout/Navbar';
import Landing  from './pages/Landing';
import Dashboard from './pages/Dashboard';
import NewAudit from './pages/NewAudit';
import AuditResults from './pages/AuditResults';
import Report   from './pages/Report';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"              element={<Landing />}      />
        <Route path="/dashboard"     element={<Dashboard />}    />
        <Route path="/audit/new"     element={<NewAudit />}     />
        <Route path="/audit/:id"     element={<AuditResults />} />
        <Route path="/report/:id"    element={<Report />}       />
      </Routes>
    </BrowserRouter>
  );
}