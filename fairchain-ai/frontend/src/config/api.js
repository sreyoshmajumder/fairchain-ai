import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE });

// ── Domain ───────────────────────────────────────────────────────
export const listDomains      = ()       => api.get('/domain/list');
export const getDomains       = ()       => api.get('/domain/list');   // alias
export const getDomainConfig  = (id)     => api.get(`/domain/${id}/config`);
export const samplePreview    = (id)     => api.get(`/domain/${id}/sample-preview`);

// ── Audit ────────────────────────────────────────────────────────
export const runAudit  = (formData)      => api.post('/audit/run', formData);
export const getAudit  = (id)            => api.get(`/audit/${id}`);
export const getHistory = ()             => api.get('/audit/history');

// ── Report ───────────────────────────────────────────────────────
export const generateReport = (payload) => api.post('/report/generate', payload);

// ── Blockchain ───────────────────────────────────────────────────
export const anchorAudit    = (payload)  => api.post('/blockchain/anchor', payload);
export const verifyReport   = (payload)  => api.post('/blockchain/verify', payload);
export const getChainRecord = (id)       => api.get(`/blockchain/record/${id}`);

export default api;