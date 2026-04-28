// ── Single source of truth for backend URL ────────────────────────────────────
export const API_BASE =
  process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ── Shared error parser ───────────────────────────────────────────────────────
async function parseError(res) {
  try {
    const j = await res.json();
    if (Array.isArray(j.detail)) {
      return j.detail.map(d => `${d.loc?.join('.')} — ${d.msg}`).join(' | ');
    }
    return j.detail ?? JSON.stringify(j);
  } catch {
    return `HTTP ${res.status}`;
  }
}

// ── Generic fetch wrapper ─────────────────────────────────────────────────────
// NOTE: NO credentials:'include' — it triggers strict CORS preflight that
// fails with TypeError:"Failed to fetch" even when the server is running.
// This app uses no cookies/sessions so credentials are not needed at all.
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;

  let res;
  try {
    res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      // ← credentials: 'include' intentionally REMOVED
      ...options,
    });
  } catch (err) {
    // Network-level failure (server down, CORS block, DNS fail)
    throw new Error(
      `Cannot reach backend at ${API_BASE}.\n` +
      `Make sure uvicorn is running:\n` +
      `  cd backend && python -m uvicorn main:app --reload --port 8000`
    );
  }

  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(detail);
  }

  return res.json();
}

// ── Domain ────────────────────────────────────────────────────────────────────
export const getDomains       = ()         => apiFetch('/domain/list');
export const getDomainConfig  = (id)       => apiFetch(`/domain/${id}/config`);
export const getSamplePreview = (id)       => apiFetch(`/domain/${id}/sample-preview`);

// ── Audit — pre-existing dataset ─────────────────────────────────────────────
export const runAudit = (domainId, sensitiveColumn, useSample = true) =>
  apiFetch('/audit/run', {
    method: 'POST',
    body: JSON.stringify({
      domain_id:        domainId,
      sensitive_column: sensitiveColumn,
      use_sample:       useSample,
    }),
  });

// ── Audit — uploaded CSV ──────────────────────────────────────────────────────
export const runAuditWithFile = async (domainId, sensitiveColumn, file) => {
  const form = new FormData();
  form.append('domain_id',        domainId);
  form.append('sensitive_column', sensitiveColumn);
  form.append('file',             file);

  let res;
  try {
    // No Content-Type header — browser sets multipart/form-data boundary automatically
    res = await fetch(`${API_BASE}/audit/run-file`, {
      method: 'POST',
      body: form,
      // ← No credentials, no Content-Type header
    });
  } catch {
    throw new Error(
      `Cannot reach backend at ${API_BASE}. Is uvicorn running on port 8000?`
    );
  }

  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(detail);
  }

  return res.json();
};

// ── Blockchain ────────────────────────────────────────────────────────────────
export const uploadToBlockchain = (reportData) =>
  apiFetch('/chain/upload', {
    method: 'POST',
    body: JSON.stringify(reportData),
  });

// ── Chat ──────────────────────────────────────────────────────────────────────
export const sendChatMessage = (message, context = {}) =>
  apiFetch('/chat/message', {
    method: 'POST',
    body: JSON.stringify({ message, context }),
  });

// ── History ───────────────────────────────────────────────────────────────────
export const getHistory     = ()    => apiFetch('/history/list');
export const getHistoryItem = (id)  => apiFetch(`/history/${id}`);
export const deleteHistory  = (id)  => apiFetch(`/history/${id}`, { method: 'DELETE' });

// ── Report ────────────────────────────────────────────────────────────────────
export const getReport = (id) => apiFetch(`/report/${id}`);

// ── Health ────────────────────────────────────────────────────────────────────
export const checkHealth = () => apiFetch('/health');