import React, { useState } from 'react';
import Badge from '../ui/Badge';

export default function DataAudit({ dataAudit = {} }) {
  const [expanded, setExpanded] = useState(true);
  const { label_balance = {}, representation = {}, imbalance = {}, proxy_risk = {}, missingness = {} } = dataAudit;

  return (
    <div style={{
      background: '#fbfaf7', border: '1px solid rgba(37,34,27,0.1)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      <button onClick={() => setExpanded(e => !e)} style={{
        width: '100%', padding: '1rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontWeight: 700, fontSize: '0.95rem', color: '#25221b',
      }}>
        <span>🔬 Dataset Audit</span>
        <span style={{ fontSize: '0.8rem', color: '#68655e' }}>{expanded ? '▲ Collapse' : '▼ Expand'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 1.5rem 1.5rem', display: 'grid', gap: '1.2rem' }}>
          {/* Label balance */}
          {label_balance.positive_rate !== undefined && (
            <div>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                color: '#68655e', marginBottom: 6 }}>Label Distribution</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  flex: 1, height: 12, borderRadius: 999,
                  background: `linear-gradient(to right, #0d6f73 ${label_balance.positive_rate*100}%, rgba(37,34,27,0.1) 0%)`,
                }} />
                <span style={{ fontSize: '0.85rem', color: '#25221b', fontWeight: 700, minWidth: 60 }}>
                  {Math.round(label_balance.positive_rate * 100)}% positive
                </span>
                <Badge label={label_balance.severity} variant={label_balance.severity} />
              </div>
            </div>
          )}

          {/* Representation */}
          {Object.keys(representation).length > 0 && (
            <div>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                color: '#68655e', marginBottom: 8 }}>Group Representation</div>
              {Object.entries(representation).map(([attr, counts]) => (
                <div key={attr} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>{attr}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(counts).map(([grp, count]) => (
                      <span key={grp} style={{
                        padding: '0.25rem 0.75rem', borderRadius: 9999, fontSize: '0.78rem',
                        background: 'rgba(13,111,115,0.08)', color: '#0d6f73',
                        border: '1px solid rgba(13,111,115,0.15)',
                      }}>
                        {grp}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Outcome imbalance */}
          {Object.keys(imbalance).length > 0 && (
            <div>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                color: '#68655e', marginBottom: 8 }}>Outcome Rate by Group</div>
              {Object.entries(imbalance).map(([attr, rates]) => (
                <div key={attr} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>{attr}</div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    {Object.entries(rates).map(([grp, rate]) => (
                      <div key={grp} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 80, fontSize: '0.82rem', color: '#68655e' }}>{grp}</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'rgba(37,34,27,0.08)' }}>
                          <div style={{ width: `${rate*100}%`, height: '100%', borderRadius: 999, background: '#0d6f73' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: 36 }}>{(rate*100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Proxy risk */}
          {Object.keys(proxy_risk).length > 0 && (
            <div style={{
              background: 'rgba(168,95,22,0.06)', border: '1px solid rgba(168,95,22,0.2)',
              borderRadius: 10, padding: '0.85rem 1rem',
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a85f16', marginBottom: 6 }}>
                ⚠️ Proxy Variable Risk
              </div>
              {Object.entries(proxy_risk).map(([attr, features]) => (
                <div key={attr} style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: '0.82rem', color: '#68655e' }}>{attr}: </span>
                  {Object.entries(features).map(([feat, corr]) => (
                    <span key={feat} style={{
                      marginLeft: 4, padding: '0.2rem 0.6rem', borderRadius: 999,
                      background: 'rgba(168,95,22,0.1)', color: '#a85f16', fontSize: '0.78rem', fontWeight: 600,
                    }}>
                      {feat} ({(corr * 100).toFixed(0)}%)
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Missing values */}
          {Object.keys(missingness).length > 0 && (
            <div style={{
              background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)',
              borderRadius: 10, padding: '0.85rem 1rem',
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c0392b', marginBottom: 6 }}>
                ❌ Missing Values
              </div>
              {Object.entries(missingness).map(([col, count]) => (
                <div key={col} style={{ fontSize: '0.82rem', color: '#68655e' }}>
                  {col}: <strong>{count}</strong> missing
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}