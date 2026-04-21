export const severityColor = s =>
  s==='low'?'#3d7a2a':s==='medium'?'#a85f16':'#c0392b';
export const domainColor = {
  lending:'#0d6f73', hiring:'#6f52c8', healthcare:'#a85f16', insurance:'#3d7a2a'
};
export const fmtPct = v => v !== undefined ? `${(v*100).toFixed(1)}%` : 'N/A';
export const truncate = (s,n=8) => s && s.length>n*2+3 ? `${s.slice(0,n)}...${s.slice(-n)}` : s;