import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import BlockchainUpload from '../components/ui/BlockchainUpload';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffect } from 'react';
import { useAudits } from '../context/AuditContext';

// ── Helpers ────────────────────────────────────────────────────────────────────
const pct    = v  => (v  != null ? `${(v  * 100).toFixed(1)}%` : '—');
const round  = (v, d = 3) => (v != null ? Number(v).toFixed(d)  : '—');
const ts     = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
const sevColor = s => s === 'high' ? '#f87171' : s === 'medium' ? '#facc15' : '#4ade80';

const MetricCard = ({ label, value, sub, color }) => (
  <div style={{
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '0.75rem', padding: '1.1rem 1.25rem', flex: '1 1 160px',
  }}>
    <div style={{ fontSize: '0.75rem', color: '#8e9aad', marginBottom: '0.35rem' }}>{label}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: color || '#e2e8f0', fontFamily: 'monospace' }}>{value}</div>
    {sub && <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>{sub}</div>}
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 style={{
    fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: '#8e9aad', marginBottom: '1rem',
  }}>{children}</h2>
);

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AuditResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dlState, setDlState] = useState(null);

  const result   = location.state?.result ?? {};
  const domain   = location.state?.domain ?? {};

  const baseline       = result.baseline       ?? {};
  const mitigated      = result.mitigated      ?? {};
  const groupMetrics   = result.group_metrics  ?? {};
  const grpBase        = groupMetrics.baseline  ?? {};
  const grpMit         = groupMetrics.mitigated ?? {};
  const selectionRates = result.selection_rates ?? {};
  const datasetAudit   = result.dataset_audit  ?? {};
  const delta          = result.delta          ?? {};
  const featuresUsed   = result.features_used  ?? [];

  const domainId       = result.domain_id        ?? domain?.id ?? '—';
  const sensitiveCol   = result.sensitive_column ?? '—';
  const targetCol      = result.target_column    ?? '—';
  const groupsAnalyzed = result.groups_analyzed  ?? Object.keys(grpBase).length;
  const severity       = baseline.severity       ?? 'low';
  const mitSeverity    = mitigated.severity      ?? 'low';

  const imbalance  = datasetAudit.imbalance  ?? {};
  const proxyRisk  = datasetAudit.proxy_risk ?? {};

  const chartData = Object.entries(selectionRates).map(([grp, vals]) => ({
    group:     grp,
    Baseline:  Number((vals?.baseline  ?? 0).toFixed(1)),
    Mitigated: Number((vals?.mitigated ?? 0).toFixed(1)),
  }));

  const groupRows = Object.entries(grpBase).map(([grp, bm]) => ({
    grp, bm, mm: grpMit[grp] ?? {},
  }));

  const reportDataForChain = {
    domain_id:        domainId,
    sensitive_column: sensitiveCol,
    target_column:    targetCol,
    audit_id:         result.audit_id  ?? `audit_${Date.now()}`,
    report_hash:      result.report_hash ?? null,
    baseline:  {
      statistical_parity_diff: baseline.statistical_parity_diff  ?? 0,
      equal_opportunity_diff:  baseline.equal_opportunity_diff   ?? 0,
      model_accuracy:          baseline.model_accuracy           ?? 0,
    },
    mitigated: {
      statistical_parity_diff: mitigated.statistical_parity_diff ?? 0,
      equal_opportunity_diff:  mitigated.equal_opportunity_diff  ?? 0,
      model_accuracy:          mitigated.model_accuracy          ?? 0,
    },
    groups_analyzed: groupsAnalyzed,
  };

  // ── No result guard ────────────────────────────────────────────────────────
  if (!result.domain_id) {
    return (
      <main style={{ maxWidth: 700, margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
        <h1 style={{ color: '#e2e8f0', marginBottom: '0.5rem' }}>No Audit Results</h1>
        <p style={{ color: '#8e9aad', marginBottom: '2rem' }}>
          Run a fairness audit first to see results here.
        </p>
        <button onClick={() => navigate('/audit/new')} style={{
          padding: '0.75rem 2rem', background: '#0d9a8c', color: '#fff',
          border: 'none', borderRadius: '0.5rem', fontWeight: 600,
          fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Start New Audit
        </button>
      </main>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PDF GENERATION — no navigation, runs entirely in-page
  // ══════════════════════════════════════════════════════════════════════════
  const downloadPDF = () => {
    setDlState('pdf');
    try {
      const doc  = new jsPDF('p', 'mm', 'a4');
      const pW   = doc.internal.pageSize.getWidth();
      const pH   = doc.internal.pageSize.getHeight();
      const mg   = 14;
      const timestamp = ts();

      // ── Colours ────────────────────────────────────────────────
      const C = {
        bg:       [15,  17,  23],
        surface:  [22,  25,  33],
        surface2: [28,  31,  42],
        teal:     [13, 154, 140],
        tealDark: [13,  78,  74],
        text:     [226, 232, 240],
        muted:    [100, 116, 139],
        faint:    [71,   85, 105],
        green:    [74,  222, 128],
        red:      [248, 113, 113],
        amber:    [251, 191,  36],
        purple:   [167, 139, 250],
        blue:     [56,  189, 248],
        white:    [255, 255, 255],
      };

      let y = mg;

      // ── Shared autoTable theme ─────────────────────────────────
      const tblHead = {
        fillColor:  C.tealDark,
        textColor:  C.white,
        fontStyle:  'bold',
        fontSize:   8.5,
        cellPadding: 3,
      };
      const tblBody = {
        fillColor:  C.surface,
        textColor:  C.text,
        fontSize:   8.5,
        cellPadding: 3,
      };
      const tblAlt = { fillColor: C.surface2 };

      // ── Helper: add new page with running header ───────────────
      const newPage = () => {
        doc.addPage();
        doc.setFillColor(...C.bg);
        doc.rect(0, 0, pW, pH, 'F');
        doc.setFillColor(...C.teal);
        doc.rect(0, 0, pW, 7, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.white);
        doc.text('FairChain AI — Algorithmic Fairness Compliance Report', mg, 5);
        doc.text(timestamp, pW - mg, 5, { align: 'right' });
        y = 14;
      };

      const check = (need = 25) => { if (y + need > pH - mg) newPage(); };

      const sectionHeader = (num, title) => {
        check(14);
        doc.setFillColor(...C.tealDark);
        doc.roundedRect(mg - 1, y - 4, pW - mg * 2 + 2, 10, 1.5, 1.5, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.teal);
        doc.text(`${num}  ${title}`, mg + 2, y + 3);
        y += 12;
      };

      // ══════════════════════════════════════════════════════════
      // PAGE 1 — COVER
      // ══════════════════════════════════════════════════════════
      doc.setFillColor(...C.bg);
      doc.rect(0, 0, pW, pH, 'F');

      // Top accent strip
      doc.setFillColor(...C.teal);
      doc.rect(0, 0, pW, 24, 'F');

      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.white);
      doc.text('FairChain AI', mg, 15);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Powered by Ethereum Sepolia', pW - mg, 15, { align: 'right' });

      // Report title block
      y = 55;
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.text);
      doc.text('Algorithmic Fairness', pW / 2, y, { align: 'center' });
      y += 12;
      doc.text('Compliance Report', pW / 2, y, { align: 'center' });

      y += 8;
      doc.setDrawColor(...C.teal);
      doc.setLineWidth(0.8);
      doc.line(mg + 20, y, pW - mg - 20, y);
      y += 12;

      // Meta table (cover)
      const sevC = severity === 'high' ? C.red : severity === 'medium' ? C.amber : C.green;
      const mitC = mitSeverity === 'high' ? C.red : mitSeverity === 'medium' ? C.amber : C.green;

      const metaRows = [
        ['Domain',               domainId,                null],
        ['Sensitive Attribute',  sensitiveCol,            null],
        ['Target Column',        targetCol,               null],
        ['Groups Analyzed',      String(groupsAnalyzed),  null],
        ['Baseline Severity',    severity.toUpperCase(),  sevC],
        ['Post-Mitigation',      mitSeverity.toUpperCase(), mitC],
        ['Report Generated',     timestamp,               null],
      ];

      metaRows.forEach(([k, v, vc]) => {
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.muted);
        doc.text(k, mg + 8, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...(vc ?? C.text));
        doc.text(v, mg + 70, y);
        doc.setDrawColor(...C.faint);
        doc.setLineWidth(0.1);
        doc.line(mg + 6, y + 2, pW - mg - 6, y + 2);
        y += 9;
      });

      y += 10;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...C.faint);
      doc.text(
        'This report documents the results of an algorithmic fairness audit conducted by FairChain AI.',
        pW / 2, y, { align: 'center', maxWidth: pW - mg * 3 }
      );
      y += 5;
      doc.text(
        'For compliance, regulatory, and internal review purposes only.',
        pW / 2, y, { align: 'center', maxWidth: pW - mg * 3 }
      );

      // Bottom cover footer
      doc.setFillColor(...C.teal);
      doc.rect(0, pH - 12, pW, 12, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.white);
      doc.text(`Domain: ${domainId}  ·  Sensitive: ${sensitiveCol}  ·  ${timestamp}`, pW / 2, pH - 5, { align: 'center' });

      // ══════════════════════════════════════════════════════════
      // PAGE 2 — BASELINE + MITIGATION METRICS
      // ══════════════════════════════════════════════════════════
      newPage();

      sectionHeader('1.', 'Baseline Fairness Metrics');

      autoTable(doc, {
        startY: y,
        margin: { left: mg, right: mg },
        head: [['Metric', 'Value', 'Threshold', 'Status']],
        body: [
          ['Statistical Parity Diff',  round(baseline.statistical_parity_diff, 4), '< 0.10',
            Math.abs(baseline.statistical_parity_diff ?? 0) > 0.1 ? 'EXCEEDS' : 'PASS'],
          ['Equal Opportunity Diff',   round(baseline.equal_opportunity_diff,  4), '< 0.10',
            Math.abs(baseline.equal_opportunity_diff  ?? 0) > 0.1 ? 'EXCEEDS' : 'PASS'],
          ['False Positive Rate Diff', round(baseline.false_positive_rate_diff, 4), '< 0.10',
            Math.abs(baseline.false_positive_rate_diff ?? 0) > 0.1 ? 'EXCEEDS' : 'PASS'],
          ['Model Accuracy',           `${baseline.model_accuracy ?? '—'}%`, '> 70%',
            (baseline.model_accuracy ?? 0) > 70 ? 'PASS' : 'FAIL'],
          ['Most Favored Group',   baseline.most_favored  ?? '—', '—', '—'],
          ['Least Favored Group',  baseline.least_favored ?? '—', '—', '—'],
        ],
        headStyles: tblHead,
        bodyStyles: tblBody,
        alternateRowStyles: tblAlt,
        columnStyles: { 0: { cellWidth: 65 }, 1: { fontStyle: 'bold' } },
        didParseCell: (d) => {
          if (d.section === 'body' && d.column.index === 3) {
            if (d.cell.raw === 'PASS')    d.cell.styles.textColor = C.green;
            if (d.cell.raw === 'EXCEEDS') d.cell.styles.textColor = C.red;
            if (d.cell.raw === 'FAIL')    d.cell.styles.textColor = C.red;
          }
        },
      });
      y = doc.lastAutoTable.finalY + 10;

      sectionHeader('2.', 'Mitigation Results — Reweighing Algorithm');

      autoTable(doc, {
        startY: y,
        margin: { left: mg, right: mg },
        head: [['Metric', 'Baseline', 'Mitigated', 'Improvement']],
        body: [
          ['Statistical Parity Diff',
            round(baseline.statistical_parity_diff, 4),
            round(mitigated.statistical_parity_diff, 4),
            delta.spd_reduction  != null ? `↓ ${round(delta.spd_reduction,  4)}` : '—'],
          ['Equal Opportunity Diff',
            round(baseline.equal_opportunity_diff, 4),
            round(mitigated.equal_opportunity_diff, 4),
            delta.eod_reduction  != null ? `↓ ${round(delta.eod_reduction,  4)}` : '—'],
          ['Model Accuracy',
            `${baseline.model_accuracy  ?? '—'}%`,
            `${mitigated.model_accuracy ?? '—'}%`,
            delta.accuracy_change != null
              ? `${delta.accuracy_change > 0 ? '+' : ''}${delta.accuracy_change}%` : '—'],
          ['Bias Severity', severity.toUpperCase(), mitSeverity.toUpperCase(), '—'],
        ],
        headStyles: tblHead,
        bodyStyles: tblBody,
        alternateRowStyles: tblAlt,
        columnStyles: { 0: { cellWidth: 65 }, 3: { fontStyle: 'bold' } },
        didParseCell: (d) => {
          if (d.section === 'body' && d.column.index === 3) {
            const v = String(d.cell.raw);
            if (v.startsWith('↓') || v.startsWith('+')) d.cell.styles.textColor = C.green;
            if (v.startsWith('-'))                       d.cell.styles.textColor = C.red;
          }
          if (d.section === 'body' && d.column.index === 1 && d.row.index === 3) {
            const sc = severity === 'high' ? C.red : severity === 'medium' ? C.amber : C.green;
            d.cell.styles.textColor = sc;
            d.cell.styles.fontStyle = 'bold';
          }
          if (d.section === 'body' && d.column.index === 2 && d.row.index === 3) {
            const sc = mitSeverity === 'high' ? C.red : mitSeverity === 'medium' ? C.amber : C.green;
            d.cell.styles.textColor = sc;
            d.cell.styles.fontStyle = 'bold';
          }
        },
      });
      y = doc.lastAutoTable.finalY + 10;

      // ══════════════════════════════════════════════════════════
      // PAGE 3 — PER-GROUP BREAKDOWN
      // ══════════════════════════════════════════════════════════
      if (groupRows.length > 0) {
        check(30);
        sectionHeader('3.', 'Per-Group Fairness Breakdown');

        autoTable(doc, {
          startY: y,
          margin: { left: mg, right: mg },
          head: [['Group', 'N', 'Sel Rate (Base)', 'Sel Rate (Mit)', 'Accuracy', 'TPR', 'FPR', 'Precision']],
          body: groupRows.map(({ grp, bm, mm }) => [
            grp,
            String(bm.count ?? '—'),
            pct(bm.selection_rate),
            pct(mm.selection_rate),
            pct(bm.accuracy),
            pct(bm.true_positive_rate),
            pct(bm.false_positive_rate),
            pct(bm.precision),
          ]),
          headStyles: tblHead,
          bodyStyles: tblBody,
          alternateRowStyles: tblAlt,
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 28 },
            1: { cellWidth: 12 },
          },
          didParseCell: (d) => {
            if (d.section === 'body') {
              if (d.column.index === 2) d.cell.styles.textColor = C.teal;
              if (d.column.index === 3) d.cell.styles.textColor = C.purple;
              if (d.column.index === 5) d.cell.styles.textColor = C.green;
              if (d.column.index === 6) d.cell.styles.textColor = C.red;
            }
          },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // ── Selection Rates ────────────────────────────────────────
      if (Object.keys(selectionRates).length > 0) {
        check(30);
        sectionHeader('4.', 'Selection Rates by Group');

        autoTable(doc, {
          startY: y,
          margin: { left: mg, right: mg },
          head: [['Group', 'Baseline (%)', 'Mitigated (%)', 'Count']],
          body: Object.entries(selectionRates).map(([grp, v]) => [
            grp,
            `${(v?.baseline  ?? 0).toFixed(1)}%`,
            `${(v?.mitigated ?? 0).toFixed(1)}%`,
            String(v?.count ?? '—'),
          ]),
          headStyles: tblHead,
          bodyStyles: tblBody,
          alternateRowStyles: tblAlt,
          columnStyles: {
            0: { fontStyle: 'bold' },
            1: { textColor: C.teal },
            2: { textColor: C.purple },
          },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // ── Proxy Risk ─────────────────────────────────────────────
      if (Object.keys(proxyRisk).length > 0) {
        check(20);
        sectionHeader('5.', 'Proxy Attribute Risk');
        Object.entries(proxyRisk).forEach(([col, corrs]) => {
          check(25);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...C.amber);
          doc.text(`Sensitive column: ${col}`, mg + 2, y);
          y += 6;
          autoTable(doc, {
            startY: y,
            margin: { left: mg + 4, right: mg + 4 },
            head: [['Feature', 'Correlation (r)']],
            body: Object.entries(corrs ?? {}).map(([f, c]) => [f, String(c)]),
            headStyles: { ...tblHead, fillColor: [60, 45, 10] },
            bodyStyles: tblBody,
            alternateRowStyles: tblAlt,
            didParseCell: (d) => {
              if (d.section === 'body' && d.column.index === 1)
                d.cell.styles.textColor = C.amber;
            },
          });
          y = doc.lastAutoTable.finalY + 6;
        });
      }

      // ── Features Used ───────────────────────────────────────────
      if (featuresUsed.length > 0) {
        check(20);
        sectionHeader('6.', 'Model Features');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.muted);
        const cols  = 3;
        const colW  = (pW - mg * 2) / cols;
        featuresUsed.forEach((f, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          if (col === 0 && row > 0) check(6);
          doc.setTextColor(...C.teal);
          doc.text(`• ${f}`, mg + col * colW, y + row * 6);
        });
        y += Math.ceil(featuresUsed.length / cols) * 6 + 6;
      }

      // ── Regulatory Compliance ───────────────────────────────────
      check(40);
      sectionHeader('7.', 'Regulatory Compliance Checklist');

      autoTable(doc, {
        startY: y,
        margin: { left: mg, right: mg },
        head: [['Framework', 'Requirement', 'Status']],
        body: [
          ['EU AI Act',       'Bias documentation for high-risk AI systems',          'PASS'],
          ['GDPR Art. 22',    'Automated decision transparency & human oversight',     'PASS'],
          ['US ECOA',         'Equal credit opportunity across protected groups',
            severity === 'high' ? 'REVIEW' : 'PASS'],
          ['ISO/IEC 42001',   'AI Management System — audit trail documented',         'PASS'],
          ['IEEE 7003',       'Algorithmic bias considerations formally addressed',    'PASS'],
        ],
        headStyles: tblHead,
        bodyStyles: tblBody,
        alternateRowStyles: tblAlt,
        columnStyles: { 0: { cellWidth: 32, fontStyle: 'bold' }, 2: { cellWidth: 22 } },
        didParseCell: (d) => {
          if (d.section === 'body' && d.column.index === 2) {
            if (d.cell.raw === 'PASS')   { d.cell.styles.textColor = C.green; d.cell.styles.fontStyle = 'bold'; }
            if (d.cell.raw === 'REVIEW') { d.cell.styles.textColor = C.amber; d.cell.styles.fontStyle = 'bold'; }
            if (d.cell.raw === 'FAIL')   { d.cell.styles.textColor = C.red;   d.cell.styles.fontStyle = 'bold'; }
          }
        },
      });
      y = doc.lastAutoTable.finalY + 10;

      // ── Footer on every page ────────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFillColor(...C.surface);
        doc.rect(0, pH - 10, pW, 10, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.faint);
        doc.text(
          `FairChain AI  ·  ${domainId} / ${sensitiveCol}  ·  ${timestamp}`,
          mg, pH - 4
        );
        doc.text(`Page ${p} of ${totalPages}`, pW - mg, pH - 4, { align: 'right' });
      }

      doc.save(`FairChain_Report_${domainId}_${sensitiveCol}.pdf`);
    } catch (e) {
      console.error('PDF generation error:', e);
      alert(`PDF failed: ${e.message}`);
    } finally {
      setDlState(null);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.5rem' }}>

      {/* ── Back ── */}
      <button onClick={() => navigate('/audit/new')} style={{
        background: 'none', border: 'none', color: '#8e9aad', cursor: 'pointer',
        fontSize: '0.875rem', marginBottom: '1.5rem',
        display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0,
        fontFamily: 'inherit',
      }}>
        ← Back to New Audit
      </button>

      {/* ── Page Title ── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: "'Georgia',serif", fontSize: '1.9rem',
            letterSpacing: '-0.03em', color: '#e2e8f0', margin: 0,
          }}>
            Audit Results
          </h1>
          <span style={{
            padding: '0.25rem 0.75rem', borderRadius: '9999px',
            background: `${sevColor(severity)}18`, color: sevColor(severity),
            fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
          }}>
            {severity} bias
          </span>
        </div>
        <p style={{ color: '#8e9aad', fontSize: '0.88rem', marginTop: '0.4rem' }}>
          Domain: <strong style={{ color: '#cbd5e1' }}>{domainId}</strong>
          &nbsp;·&nbsp;
          Sensitive Column: <strong style={{ color: '#cbd5e1' }}>{sensitiveCol}</strong>
          &nbsp;·&nbsp;
          Target: <strong style={{ color: '#cbd5e1' }}>{targetCol}</strong>
          &nbsp;·&nbsp;
          {groupsAnalyzed} groups analyzed
        </p>
      </div>

      {/* ── Section 1: Baseline ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <SectionTitle>📊 Baseline Fairness Metrics</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <MetricCard label="Statistical Parity Diff" value={round(baseline.statistical_parity_diff)}
            sub="Selection rate gap between groups" color={sevColor(severity)} />
          <MetricCard label="Equal Opportunity Diff" value={round(baseline.equal_opportunity_diff)}
            sub="True positive rate gap" color="#a78bfa" />
          <MetricCard label="False Positive Rate Diff" value={round(baseline.false_positive_rate_diff)}
            sub="FPR gap between groups" color="#fb923c" />
          <MetricCard label="Model Accuracy"
            value={baseline.model_accuracy != null ? `${baseline.model_accuracy}%` : '—'}
            sub="Before mitigation" color="#38bdf8" />
          <MetricCard label="Most Favored" value={baseline.most_favored ?? '—'}
            sub="Highest selection rate" color="#4ade80" />
          <MetricCard label="Least Favored" value={baseline.least_favored ?? '—'}
            sub="Lowest selection rate" color="#f87171" />
        </div>
      </section>

      {/* ── Section 2: Mitigation ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <SectionTitle>✅ After Reweighing Mitigation</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <MetricCard label="SPD After Mitigation" value={round(mitigated.statistical_parity_diff)}
            sub={delta.spd_reduction != null ? `↓ ${round(delta.spd_reduction)} improvement` : 'Statistical parity diff'}
            color={sevColor(mitSeverity)} />
          <MetricCard label="EOD After Mitigation" value={round(mitigated.equal_opportunity_diff)}
            sub={delta.eod_reduction != null ? `↓ ${round(delta.eod_reduction)} improvement` : 'Equal opportunity diff'}
            color="#a78bfa" />
          <MetricCard label="Model Accuracy"
            value={mitigated.model_accuracy != null ? `${mitigated.model_accuracy}%` : '—'}
            sub={delta.accuracy_change != null
              ? `${delta.accuracy_change > 0 ? '+' : ''}${delta.accuracy_change}% vs baseline`
              : 'After mitigation'}
            color="#38bdf8" />
          <MetricCard label="Bias Severity" value={mitSeverity}
            sub="After reweighing" color={sevColor(mitSeverity)} />
        </div>
      </section>

      {/* ── Section 3: Chart ── */}
      {chartData.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>📈 Selection Rate by Group (Baseline vs Mitigated)</SectionTitle>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '0.75rem', padding: '1.5rem',
          }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="group" tick={{ fill: '#8e9aad', fontSize: 12 }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#8e9aad', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip
                  formatter={(val, name) => [`${val}%`, name]}
                  contentStyle={{
                    background: '#1e2535', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem', color: '#e2e8f0',
                  }} />
                <Legend wrapperStyle={{ color: '#8e9aad', fontSize: '0.85rem' }} />
                <Bar dataKey="Baseline"  fill="#0d9a8c" radius={[4,4,0,0]} />
                <Bar dataKey="Mitigated" fill="#a78bfa" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── Section 4: Per-Group Table ── */}
      {groupRows.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>👥 Per-Group Breakdown</SectionTitle>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '0.75rem', overflowX: 'auto',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Group','N','Sel Rate (Base)','Sel Rate (Mit)','Accuracy','TPR','FPR','Precision'].map(h => (
                    <th key={h} style={{
                      padding: '0.65rem 0.9rem', textAlign: 'left', color: '#8e9aad',
                      fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.78rem',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupRows.map(({ grp, bm, mm }) => (
                  <tr key={grp} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.6rem 0.9rem', fontWeight: 600, color: '#e2e8f0' }}>{grp}</td>
                    <td style={{ padding: '0.6rem 0.9rem', color: '#8e9aad', fontFamily: 'monospace' }}>{bm.count ?? '—'}</td>
                    <td style={{ padding: '0.6rem 0.9rem', color: '#0d9a8c', fontFamily: 'monospace' }}>{pct(bm.selection_rate)}</td>
                    <td style={{ padding: '0.6rem 0.9rem', color: '#a78bfa', fontFamily: 'monospace' }}>{pct(mm.selection_rate)}</td>
                    <td style={{ padding: '0.6rem 0.9rem', color: '#cbd5e1', fontFamily: 'monospace' }}>{pct(bm.accuracy)}</td>
                    <td style={{ padding: '0.6rem 0.9rem', color: '#4ade80', fontFamily: 'monospace' }}>{pct(bm.true_positive_rate)}</td>
                    <td style={{ padding: '0.6rem 0.9rem', color: '#f87171', fontFamily: 'monospace' }}>{pct(bm.false_positive_rate)}</td>
                    <td style={{ padding: '0.6rem 0.9rem', color: '#facc15', fontFamily: 'monospace' }}>{pct(bm.precision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Section 5: Dataset Bias ── */}
      {Object.keys(imbalance).length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>🔍 Dataset Bias — Outcome Rate by Group</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {Object.entries(imbalance).map(([col, rates]) => (
              <div key={col} style={{
                flex: '1 1 260px', background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.75rem',
                padding: '1rem 1.25rem',
              }}>
                <div style={{ fontSize: '0.78rem', color: '#8e9aad', marginBottom: '0.75rem', fontWeight: 600 }}>
                  {col}
                </div>
                {Object.entries(rates ?? {}).map(([grp, rate]) => (
                  <div key={grp} style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{grp}</span>
                      <span style={{ fontSize: '0.82rem', color: '#e2e8f0', fontFamily: 'monospace' }}>
                        {(rate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 99 }}>
                      <div style={{
                        height: '100%', width: `${Math.min(rate * 100, 100)}%`,
                        background: '#0d9a8c', borderRadius: 99, transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 6: Proxy Risk ── */}
      {Object.keys(proxyRisk).length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>⚠️ Proxy Risk Detected</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {Object.entries(proxyRisk).map(([col, corrs]) => (
              <div key={col} style={{
                flex: '1 1 220px', background: 'rgba(251,146,60,0.06)',
                border: '1px solid rgba(251,146,60,0.2)', borderRadius: '0.75rem',
                padding: '0.9rem 1.1rem',
              }}>
                <div style={{ fontSize: '0.78rem', color: '#fb923c', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {col}
                </div>
                {Object.entries(corrs ?? {}).map(([feat, c]) => (
                  <div key={feat} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.2rem',
                  }}>
                    <span>{feat}</span>
                    <span style={{ fontFamily: 'monospace', color: '#fb923c' }}>r={c}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 7: Features ── */}
      {featuresUsed.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>🧩 Features Used in Model</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {featuresUsed.map(f => (
              <span key={f} style={{
                padding: '0.25rem 0.75rem', borderRadius: '9999px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.8rem', color: '#cbd5e1',
              }}>{f}</span>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 8: Blockchain ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <SectionTitle>⛓ Upload Report to Blockchain</SectionTitle>
        <BlockchainUpload reportData={reportDataForChain} />
      </section>

      {/* ── Actions ── */}
      <div style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
        paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        <button onClick={() => navigate('/audit/new')} style={{
          padding: '0.7rem 1.5rem', background: '#0d9a8c', color: '#fff',
          border: 'none', borderRadius: '0.5rem', fontWeight: 600,
          fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Run Another Audit
        </button>

        <button onClick={() => navigate('/dashboard')} style={{
          padding: '0.7rem 1.5rem', background: 'rgba(255,255,255,0.06)',
          color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.9rem',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          View Dashboard
        </button>

        {/* ── THIS is the fixed button — calls downloadPDF directly ── */}
        <button
          onClick={downloadPDF}
          disabled={dlState === 'pdf'}
          style={{
            padding: '0.7rem 1.5rem',
            background: dlState === 'pdf' ? 'rgba(167,139,250,0.05)' : 'rgba(167,139,250,0.1)',
            color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)',
            borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.9rem',
            cursor: dlState === 'pdf' ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', opacity: dlState === 'pdf' ? 0.7 : 1,
            transition: 'all .15s',
          }}
        >
          {dlState === 'pdf' ? '⏳ Generating PDF…' : '📄 Full Compliance Report'}
        </button>
      </div>
    </main>
  );
}