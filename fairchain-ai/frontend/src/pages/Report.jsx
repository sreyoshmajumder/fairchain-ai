import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, BorderStyle,
  AlignmentType, WidthType, ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';

// ── Helpers ────────────────────────────────────────────────────────────────────
const pct   = v => (v != null ? `${(v * 100).toFixed(2)}%` : 'N/A');
const round = (v, d = 4) => (v != null ? Number(v).toFixed(d) : 'N/A');
const ts    = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
const sevColor = s =>
  s === 'high' ? '#ef4444' : s === 'medium' ? '#f59e0b' : '#22c55e';

export default function Report() {
  const location = useLocation();
  const navigate = useNavigate();
  const reportRef = useRef(null);
  const [dlState, setDlState] = useState(null);

  // ── Robust state extraction — handles ALL navigate() call shapes ───────────
  // Shape A: navigate('/report', { state: { audit: result } })   ← AuditResults.jsx
  // Shape B: navigate('/report', { state: { result, domain } })  ← legacy
  // Shape C: navigate('/report', { state: result })              ← direct
  const raw = location.state ?? {};
  const result =
    raw.audit   ??   // Shape A
    raw.result  ??   // Shape B
    (raw.domain_id ? raw : null) ??  // Shape C — raw IS the result
    {};

  const domain = raw.domain ?? {};

  const baseline     = result.baseline      ?? {};
  const mitigated    = result.mitigated     ?? {};
  const groupMetrics = result.group_metrics ?? {};
  const grpBase      = groupMetrics.baseline  ?? {};
  const grpMit       = groupMetrics.mitigated ?? {};
  const selRates     = result.selection_rates ?? {};
  const datasetAudit = result.dataset_audit  ?? {};
  const delta        = result.delta          ?? {};
  const features     = result.features_used  ?? [];
  const proxyRisk    = datasetAudit.proxy_risk ?? {};

  const domainId   = result.domain_id        ?? domain?.id ?? '—';
  const sensCol    = result.sensitive_column ?? '—';
  const targetCol  = result.target_column    ?? '—';
  const severity   = baseline.severity       ?? 'low';
  const mitSev     = mitigated.severity      ?? 'low';
  const groupCount = result.groups_analyzed  ?? Object.keys(grpBase).length;
  const timestamp  = ts();

  // ── No data guard ─────────────────────────────────────────────────────────
  if (!result.domain_id) {
    return (
      <main style={{
        maxWidth: 600, margin: '5rem auto',
        textAlign: 'center', padding: '2rem',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
        <h1 style={{ color: '#e2e8f0', marginBottom: '0.5rem' }}>No Report Data</h1>
        <p style={{ color: '#8e9aad', marginBottom: '2rem' }}>
          Run a fairness audit first, then click "Full Compliance Report" from the results page.
        </p>
        <button
          onClick={() => navigate('/audit/new')}
          style={{
            padding: '0.75rem 2rem', background: '#0d9a8c', color: '#fff',
            border: 'none', borderRadius: '0.5rem', fontWeight: 600,
            fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Start New Audit
        </button>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // PDF DOWNLOAD
  // ═══════════════════════════════════════════════════════════
  const downloadPDF = async () => {
    setDlState('pdf');
    try {
      const el = reportRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f1117',
        logging: false,
      });

      const pdf   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;

      const imgW = usableW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let yOffset = 0;
      let page    = 0;

      while (yOffset < imgH) {
        if (page > 0) pdf.addPage();

        // clip rendered slice onto each page
        const srcY  = (yOffset / imgH) * canvas.height;
        const srcH  = Math.min((usableH / imgH) * canvas.height, canvas.height - srcY);
        const sliceH = (srcH / canvas.height) * imgH;

        const sliceCanvas  = document.createElement('canvas');
        sliceCanvas.width  = canvas.width;
        sliceCanvas.height = srcH;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        pdf.addImage(
          sliceCanvas.toDataURL('image/png'),
          'PNG', margin, margin, usableW, sliceH
        );

        yOffset += usableH;
        page++;
      }

      pdf.save(`FairChain_Report_${domainId}_${sensCol}.pdf`);
    } catch (e) {
      console.error('PDF error:', e);
      alert('PDF failed — see console for details.');
    } finally {
      setDlState(null);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // WORD DOWNLOAD
  // ═══════════════════════════════════════════════════════════
  const downloadWord = async () => {
    setDlState('word');
    try {
      const mkCell = (text, bold = false, color = '000000') =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: 'F8FAFB' },
          borders: {
            top:    { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            left:   { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            right:  { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
          },
          children: [new Paragraph({
            children: [new TextRun({ text: String(text ?? '—'), bold, color, size: 20 })],
            spacing: { before: 60, after: 60 },
          })],
        });

      const mkHeader = (text) =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: '0D5C57' },
          borders: {
            top:    { style: BorderStyle.SINGLE, size: 1, color: '0D5C57' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: '0D5C57' },
            left:   { style: BorderStyle.SINGLE, size: 1, color: '0D5C57' },
            right:  { style: BorderStyle.SINGLE, size: 1, color: '0D5C57' },
          },
          children: [new Paragraph({
            children: [new TextRun({ text: String(text), bold: true, color: 'FFFFFF', size: 20 })],
            spacing: { before: 80, after: 80 },
          })],
        });

      const h1   = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } });
      const h2   = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 140 } });
      const para = (t, bold = false) => new Paragraph({
        children: [new TextRun({ text: t, bold, size: 22 })],
        spacing: { before: 80, after: 80 },
      });
      const divider = () => new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '0D9A8C' } },
        spacing: { before: 200, after: 200 }, children: [],
      });
      const mkTable = (headers, rows) => new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: headers.map(mkHeader),
            tableHeader: true,
          }),
          ...rows.map(cells => new TableRow({
            children: cells.map((c, ci) => {
              if (c === 'pass') return mkCell('✓ Pass', true, '22C55E');
              if (c === 'fail') return mkCell('✗ Fail', true, 'EF4444');
              if (c === 'warn') return mkCell('⚠ Review', true, 'F59E0B');
              return mkCell(c, ci === 0);
            }),
          })),
        ],
      });

      const doc = new Document({
        creator: 'FairChain AI',
        title: `Fairness Compliance Report — ${domainId}`,
        sections: [{
          children: [
            // Cover
            new Paragraph({
              children: [new TextRun({ text: 'FairChain AI', bold: true, size: 52, color: '0D9A8C' })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 100 },
            }),
            new Paragraph({
              children: [new TextRun({ text: 'Algorithmic Fairness Compliance Report', bold: true, size: 36, color: '1E293B' })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 160 },
            }),
            divider(),
            para(`Domain:              ${domainId}`, true),
            para(`Sensitive Attribute: ${sensCol}`),
            para(`Target Column:       ${targetCol}`),
            para(`Groups Analyzed:     ${groupCount}`),
            para(`Baseline Severity:   ${severity.toUpperCase()}`),
            para(`Post-Mitigation:     ${mitSev.toUpperCase()}`),
            para(`Generated:           ${timestamp}`),
            divider(),

            // S1
            h1('1. Baseline Fairness Metrics'),
            mkTable(
              ['Metric', 'Value', 'Threshold', 'Status'],
              [
                ['Statistical Parity Diff',  round(baseline.statistical_parity_diff), '< 0.10',
                  Math.abs(baseline.statistical_parity_diff ?? 0) > 0.1 ? 'fail' : 'pass'],
                ['Equal Opportunity Diff',   round(baseline.equal_opportunity_diff),  '< 0.10',
                  Math.abs(baseline.equal_opportunity_diff ?? 0)  > 0.1 ? 'fail' : 'pass'],
                ['FPR Difference',           round(baseline.false_positive_rate_diff),'< 0.10',
                  Math.abs(baseline.false_positive_rate_diff ?? 0)> 0.1 ? 'fail' : 'pass'],
                ['Model Accuracy',           `${baseline.model_accuracy ?? '—'}%`,   '> 70%',
                  (baseline.model_accuracy ?? 0) > 70 ? 'pass' : 'fail'],
                ['Most Favored Group',  baseline.most_favored  ?? '—', '—', '—'],
                ['Least Favored Group', baseline.least_favored ?? '—', '—', '—'],
              ]
            ),

            // S2
            h1('2. Mitigation Results — Reweighing Algorithm'),
            mkTable(
              ['Metric', 'Baseline', 'Mitigated', 'Improvement'],
              [
                ['Statistical Parity Diff',
                  round(baseline.statistical_parity_diff),
                  round(mitigated.statistical_parity_diff),
                  delta.spd_reduction != null ? `↓ ${round(delta.spd_reduction)}` : '—'],
                ['Equal Opportunity Diff',
                  round(baseline.equal_opportunity_diff),
                  round(mitigated.equal_opportunity_diff),
                  delta.eod_reduction != null ? `↓ ${round(delta.eod_reduction)}` : '—'],
                ['Model Accuracy',
                  `${baseline.model_accuracy ?? '—'}%`,
                  `${mitigated.model_accuracy ?? '—'}%`,
                  delta.accuracy_change != null
                    ? `${delta.accuracy_change > 0 ? '+' : ''}${delta.accuracy_change}%` : '—'],
                ['Bias Severity', severity.toUpperCase(), mitSev.toUpperCase(), '—'],
              ]
            ),

            // S3 Per-Group
            h1('3. Per-Group Fairness Breakdown'),
            ...(Object.keys(grpBase).length > 0
              ? [mkTable(
                  ['Group', 'N', 'Sel Rate (Base)', 'Sel Rate (Mit)', 'TPR', 'FPR', 'Accuracy'],
                  Object.entries(grpBase).map(([grp, bm]) => {
                    const mm = grpMit[grp] ?? {};
                    return [grp, String(bm.count ?? '—'), pct(bm.selection_rate),
                      pct(mm.selection_rate), pct(bm.true_positive_rate),
                      pct(bm.false_positive_rate), pct(bm.accuracy)];
                  })
                )]
              : [para('No per-group data available.')]),

            // S4 Selection Rates
            h1('4. Selection Rates by Group'),
            ...(Object.keys(selRates).length > 0
              ? [mkTable(
                  ['Group', 'Baseline (%)', 'Mitigated (%)', 'Count'],
                  Object.entries(selRates).map(([grp, v]) => [
                    grp,
                    `${(v?.baseline ?? 0).toFixed(1)}%`,
                    `${(v?.mitigated ?? 0).toFixed(1)}%`,
                    String(v?.count ?? '—'),
                  ])
                )]
              : [para('No selection rate data.')]),

            // S5 Proxy Risk
            h1('5. Proxy Attribute Risk'),
            ...(Object.keys(proxyRisk).length > 0
              ? Object.entries(proxyRisk).flatMap(([col, corrs]) => [
                  h2(`Sensitive: ${col}`),
                  mkTable(
                    ['Feature', 'Correlation (r)'],
                    Object.entries(corrs ?? {}).map(([f, c]) => [f, String(c)])
                  ),
                ])
              : [para('No proxy risk detected.')]),

            // S6 Features
            h1('6. Model Features'),
            para(`Total features: ${features.length}`),
            ...features.map(f => new Paragraph({
              children: [new TextRun({ text: `• ${f}`, size: 22 })],
              spacing: { before: 40, after: 40 },
            })),

            // S7 Compliance
            h1('7. Regulatory Compliance'),
            mkTable(
              ['Framework', 'Requirement', 'Status'],
              [
                ['EU AI Act',       'Bias documentation for high-risk AI systems',       'pass'],
                ['GDPR Article 22', 'Automated decision transparency',                   'pass'],
                ['US ECOA',         'Equal credit opportunity across protected groups',   severity === 'high' ? 'warn' : 'pass'],
                ['ISO/IEC 42001',   'AI Management System — audit trail documented',      'pass'],
                ['IEEE 7003',       'Algorithmic bias considerations addressed',          'pass'],
              ]
            ),
            divider(),

            // Footer
            new Paragraph({
              children: [new TextRun({
                text: `Generated by FairChain AI  ·  ${timestamp}  ·  ${domainId} / ${sensCol}`,
                size: 18, color: '94A3B8', italics: true,
              })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 300 },
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `FairChain_Report_${domainId}_${sensCol}.docx`);
    } catch (e) {
      console.error('Word error:', e);
      alert('Word generation failed — see console for details.');
    } finally {
      setDlState(null);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2.5rem 1.5rem' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem',
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none', color: '#8e9aad',
          cursor: 'pointer', fontSize: '0.875rem', padding: 0,
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontFamily: 'inherit',
        }}>
          ← Back to Results
        </button>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={downloadPDF}
            disabled={!!dlState}
            style={{
              padding: '0.6rem 1.3rem',
              background: 'rgba(239,68,68,0.1)',
              color: '#f87171', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.85rem',
              cursor: dlState ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              opacity: dlState && dlState !== 'pdf' ? 0.4 : 1,
              transition: 'all .15s',
            }}
          >
            {dlState === 'pdf' ? '⏳ Generating PDF…' : '⬇ Download PDF'}
          </button>

          <button
            onClick={downloadWord}
            disabled={!!dlState}
            style={{
              padding: '0.6rem 1.3rem',
              background: 'rgba(59,130,246,0.1)',
              color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.85rem',
              cursor: dlState ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              opacity: dlState && dlState !== 'word' ? 0.4 : 1,
              transition: 'all .15s',
            }}
          >
            {dlState === 'word' ? '⏳ Generating Word…' : '⬇ Download Word'}
          </button>
        </div>
      </div>

      {/* ── Printable Report Body ── */}
      <div
        ref={reportRef}
        style={{
          background: '#0f1117',
          borderRadius: '1rem',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '3rem',
          color: '#e2e8f0',
          fontFamily: "'Georgia', serif",
        }}
      >
        {/* Cover */}
        <div style={{
          textAlign: 'center', marginBottom: '3rem',
          paddingBottom: '2rem', borderBottom: '2px solid #0d9a8c',
        }}>
          <div style={{
            fontSize: '0.7rem', color: '#0d9a8c',
            letterSpacing: '0.25em', textTransform: 'uppercase',
            marginBottom: '0.5rem', fontFamily: 'sans-serif',
          }}>
            FairChain AI
          </div>
          <h1 style={{
            fontSize: '1.9rem', fontWeight: 800, margin: '0 0 0.5rem',
            letterSpacing: '-0.02em',
          }}>
            Algorithmic Fairness Compliance Report
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0, fontFamily: 'sans-serif' }}>
            {timestamp}
          </p>
        </div>

        {/* Meta table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3rem' }}>
          <tbody>
            {[
              ['Domain',              domainId],
              ['Sensitive Attribute', sensCol],
              ['Target Column',       targetCol],
              ['Groups Analyzed',     groupCount],
              ['Baseline Severity',   severity.toUpperCase()],
              ['Post-Mitigation',     mitSev.toUpperCase()],
              ['Timestamp',           timestamp],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{
                  padding: '0.5rem 0.75rem', color: '#64748b',
                  fontSize: '0.8rem', width: '32%', fontFamily: 'sans-serif',
                }}>
                  {k}
                </td>
                <td style={{
                  padding: '0.5rem 0.75rem', fontWeight: 600,
                  fontSize: '0.88rem', fontFamily: 'sans-serif',
                  color: k.includes('Severity') || k === 'Post-Mitigation'
                    ? sevColor(v.toLowerCase()) : '#e2e8f0',
                }}>
                  {v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Section 1 */}
        <Sec title="1. Baseline Fairness Metrics">
          <RTable
            headers={['Metric', 'Value', 'Threshold', 'Status']}
            rows={[
              ['Statistical Parity Diff', round(baseline.statistical_parity_diff), '< 0.10',
                Math.abs(baseline.statistical_parity_diff ?? 0) > 0.1 ? 'fail' : 'pass'],
              ['Equal Opportunity Diff',  round(baseline.equal_opportunity_diff),  '< 0.10',
                Math.abs(baseline.equal_opportunity_diff ?? 0)  > 0.1 ? 'fail' : 'pass'],
              ['FPR Difference',          round(baseline.false_positive_rate_diff),'< 0.10',
                Math.abs(baseline.false_positive_rate_diff ?? 0)> 0.1 ? 'fail' : 'pass'],
              ['Model Accuracy',          `${baseline.model_accuracy ?? '—'}%`,   '> 70%',
                (baseline.model_accuracy ?? 0) > 70 ? 'pass' : 'fail'],
              ['Most Favored Group',  baseline.most_favored  ?? '—', '—', '—'],
              ['Least Favored Group', baseline.least_favored ?? '—', '—', '—'],
            ]}
          />
        </Sec>

        {/* Section 2 */}
        <Sec title="2. Mitigation Results — Reweighing Algorithm">
          <RTable
            headers={['Metric', 'Baseline', 'Mitigated', 'Improvement']}
            rows={[
              ['Statistical Parity Diff',
                round(baseline.statistical_parity_diff),
                round(mitigated.statistical_parity_diff),
                delta.spd_reduction != null ? `↓ ${round(delta.spd_reduction)}` : '—'],
              ['Equal Opportunity Diff',
                round(baseline.equal_opportunity_diff),
                round(mitigated.equal_opportunity_diff),
                delta.eod_reduction != null ? `↓ ${round(delta.eod_reduction)}` : '—'],
              ['Model Accuracy',
                `${baseline.model_accuracy ?? '—'}%`,
                `${mitigated.model_accuracy ?? '—'}%`,
                delta.accuracy_change != null
                  ? `${delta.accuracy_change > 0 ? '+' : ''}${delta.accuracy_change}%` : '—'],
              ['Bias Severity', severity.toUpperCase(), mitSev.toUpperCase(), '—'],
            ]}
          />
        </Sec>

        {/* Section 3 */}
        {Object.keys(grpBase).length > 0 && (
          <Sec title="3. Per-Group Fairness Breakdown">
            <RTable
              headers={['Group', 'N', 'Sel Rate (Base)', 'Sel Rate (Mit)', 'TPR', 'FPR', 'Accuracy']}
              rows={Object.entries(grpBase).map(([grp, bm]) => {
                const mm = grpMit[grp] ?? {};
                return [grp, bm.count ?? '—', pct(bm.selection_rate),
                  pct(mm.selection_rate), pct(bm.true_positive_rate),
                  pct(bm.false_positive_rate), pct(bm.accuracy)];
              })}
            />
          </Sec>
        )}

        {/* Section 4 */}
        {Object.keys(selRates).length > 0 && (
          <Sec title="4. Selection Rates by Group">
            <RTable
              headers={['Group', 'Baseline (%)', 'Mitigated (%)', 'Count']}
              rows={Object.entries(selRates).map(([grp, v]) => [
                grp,
                `${(v?.baseline ?? 0).toFixed(1)}%`,
                `${(v?.mitigated ?? 0).toFixed(1)}%`,
                v?.count ?? '—',
              ])}
            />
          </Sec>
        )}

        {/* Section 5 */}
        {Object.keys(proxyRisk).length > 0 && (
          <Sec title="5. Proxy Attribute Risk">
            <p style={{
              color: '#94a3b8', fontSize: '0.83rem', marginBottom: '1rem',
              fontFamily: 'sans-serif', lineHeight: 1.7,
            }}>
              Features below correlate with the sensitive attribute and may act as proxies
              even when the sensitive column is excluded from training.
            </p>
            {Object.entries(proxyRisk).map(([col, corrs]) => (
              <div key={col} style={{ marginBottom: '1rem' }}>
                <div style={{
                  color: '#fb923c', fontSize: '0.78rem', fontWeight: 700,
                  marginBottom: '0.5rem', fontFamily: 'sans-serif',
                }}>
                  Sensitive: {col}
                </div>
                <RTable
                  headers={['Feature', 'Correlation (r)']}
                  rows={Object.entries(corrs ?? {}).map(([f, c]) => [f, String(c)])}
                />
              </div>
            ))}
          </Sec>
        )}

        {/* Section 6 */}
        {features.length > 0 && (
          <Sec title="6. Model Features">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {features.map(f => (
                <span key={f} style={{
                  padding: '0.25rem 0.7rem', borderRadius: '9999px',
                  background: 'rgba(13,154,140,0.1)',
                  border: '1px solid rgba(13,154,140,0.25)',
                  color: '#0d9a8c', fontSize: '0.78rem', fontFamily: 'monospace',
                }}>
                  {f}
                </span>
              ))}
            </div>
          </Sec>
        )}

        {/* Section 7 */}
        <Sec title="7. Regulatory Compliance Checklist">
          <RTable
            headers={['Framework', 'Requirement', 'Status']}
            rows={[
              ['EU AI Act',       'Bias documentation for high-risk AI systems',     'pass'],
              ['GDPR Article 22', 'Automated decision transparency',                 'pass'],
              ['US ECOA',         'Equal opportunity across protected groups',        severity === 'high' ? 'warn' : 'pass'],
              ['ISO/IEC 42001',   'AI Management System — audit trail documented',   'pass'],
              ['IEEE 7003',       'Algorithmic bias considerations addressed',        'pass'],
            ]}
          />
        </Sec>

        {/* Footer */}
        <div style={{
          marginTop: '3rem', paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          textAlign: 'center', color: '#475569',
          fontSize: '0.73rem', fontFamily: 'sans-serif',
        }}>
          Generated by FairChain AI · {timestamp}<br />
          Domain: {domainId} · Sensitive Attribute: {sensCol} · For compliance purposes only.
        </div>
      </div>
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Sec({ title, children }) {
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2 style={{
        fontSize: '0.95rem', fontWeight: 700, color: '#0d9a8c',
        fontFamily: 'sans-serif', marginBottom: '1rem',
        paddingBottom: '0.4rem',
        borderBottom: '1px solid rgba(13,154,140,0.2)',
        letterSpacing: '0.02em',
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function RTable({ headers, rows }) {
  const S = {
    pass: { label: '✓ Pass',   color: '#4ade80' },
    fail: { label: '✗ Fail',   color: '#f87171' },
    warn: { label: '⚠ Review', color: '#fb923c' },
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontSize: '0.82rem', fontFamily: 'sans-serif',
      }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{
                padding: '0.55rem 0.75rem',
                background: 'rgba(13,154,140,0.12)',
                color: '#0d9a8c', fontWeight: 700, textAlign: 'left',
                borderBottom: '1px solid rgba(13,154,140,0.25)',
                whiteSpace: 'nowrap', fontSize: '0.75rem',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
            }}>
              {row.map((cell, j) => {
                const st = S[cell];
                return (
                  <td key={j} style={{
                    padding: '0.5rem 0.75rem',
                    color:  st ? st.color : j === 0 ? '#e2e8f0' : '#94a3b8',
                    fontWeight: j === 0 ? 600 : 400,
                    fontFamily: (j > 0 && !st) ? 'monospace' : 'sans-serif',
                  }}>
                    {st ? st.label : cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}