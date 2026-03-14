'use client'
import React from 'react'

/* ── Card ─────────────────────────────────────────────── */
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e0d8', borderRadius:8, padding:20, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', ...style }}>
      {children}
    </div>
  )
}

/* ── CardTitle ─────────────────────────────────────────── */
export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#9e9b94', marginBottom:12 }}>
      {children}
    </div>
  )
}

/* ── KpiCard ───────────────────────────────────────────── */
export function KpiCard({ label, value, sub, flag }: {
  label: string; value: string | number; sub?: string;
  flag?: { text: string; level: 'red' | 'amber' | 'green' }
}) {
  const flagColors = {
    red:   { bg:'#fdecea', color:'#c0392b' },
    amber: { bg:'#fef3e2', color:'#b45309' },
    green: { bg:'#e6f4ee', color:'#1a7f5a' },
  }
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e0d8', borderRadius:8, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#9e9b94', marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:600, letterSpacing:-1, fontFamily:'DM Mono,monospace' }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:'#6b6860', marginTop:4 }}>{sub}</div>}
      {flag && (
        <span style={{ ...flagColors[flag.level], fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:100, display:'inline-block', marginTop:6 }}>
          {flag.text}
        </span>
      )}
    </div>
  )
}

/* ── PageHeader ────────────────────────────────────────── */
export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div style={{ marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
      <div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.4 }}>{title}</div>
        {subtitle && <div style={{ color:'#6b6860', fontSize:13, marginTop:3 }}>{subtitle}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

/* ── Btn ───────────────────────────────────────────────── */
export function Btn({ children, onClick, primary, disabled, small, style }: {
  children: React.ReactNode; onClick?: () => void; primary?: boolean;
  disabled?: boolean; small?: boolean; style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily:'inherit',
        fontSize: small ? 12 : 13,
        padding: small ? '4px 10px' : '6px 14px',
        borderRadius:6,
        border: primary ? 'none' : '1px solid #e2e0d8',
        background: primary ? '#2a5cff' : '#fff',
        color: primary ? '#fff' : '#1a1917',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        whiteSpace:'nowrap',
        ...style,
      }}>
      {children}
    </button>
  )
}

/* ── Badge ─────────────────────────────────────────────── */
export function Badge({ text, type }: { text: string; type?: 'blue'|'green'|'amber'|'red'|'gray' }) {
  const colors: Record<string, { bg: string; color: string }> = {
    blue:  { bg:'#eef1ff', color:'#2a5cff' },
    green: { bg:'#e6f4ee', color:'#1a7f5a' },
    amber: { bg:'#fef3e2', color:'#b45309' },
    red:   { bg:'#fdecea', color:'#c0392b' },
    gray:  { bg:'#f0efe9', color:'#6b6860' },
  }
  const c = colors[type || 'gray']
  return (
    <span style={{ ...c, fontSize:11, fontWeight:500, padding:'3px 8px', borderRadius:100, whiteSpace:'nowrap', display:'inline-block' }}>
      {text}
    </span>
  )
}

/* ── StatusBadge ───────────────────────────────────────── */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'blue'|'amber'|'green'> = {
    'Open':'blue', 'In Progress':'amber', 'Done':'green',
  }
  return <Badge text={status} type={map[status] || 'gray'} />
}

/* ── SeverityBadge ─────────────────────────────────────── */
export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, 'red'|'amber'|'green'> = { High:'red', Med:'amber', Low:'green' }
  return <Badge text={severity} type={map[severity] || 'gray'} />
}

/* ── Table ─────────────────────────────────────────────── */
export function Table({ heads, children, empty }: {
  heads: string[]; children: React.ReactNode; empty?: boolean
}) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            {heads.map(h => (
              <th key={h} style={{ textAlign:'left', fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#9e9b94', padding:'8px 12px', borderBottom:'1px solid #e2e0d8' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && <div style={{ textAlign:'center', color:'#9e9b94', padding:32, fontSize:13 }}>No records found.</div>}
    </div>
  )
}

export function Td({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding:'10px 12px', borderBottom:'1px solid #e2e0d8', fontSize:13, verticalAlign:'middle', ...style }}>
      {children}
    </td>
  )
}

/* ── FormGroup ─────────────────────────────────────────── */
export function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:12, fontWeight:500, color:'#6b6860' }}>{label}</label>
      {children}
    </div>
  )
}

export const inputStyle: React.CSSProperties = {
  fontFamily:'inherit', fontSize:13, padding:'7px 10px',
  border:'1px solid #e2e0d8', borderRadius:6,
  background:'#fff', color:'#1a1917', width:'100%', outline:'none',
}

/* ── EmptyState ────────────────────────────────────────── */
export function EmptyState({ message }: { message: string }) {
  return <div style={{ textAlign:'center', color:'#9e9b94', padding:32, fontSize:13 }}>{message}</div>
}

/* ── Placeholder page ──────────────────────────────────── */
export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:280, gap:12 }}>
          <div style={{ width:52, height:52, background:'#f0efe9', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="#9e9b94" strokeWidth="1.5"/>
              <path d="M8 12h8M8 8h5M8 16h3" stroke="#9e9b94" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontWeight:600, fontSize:16 }}>{title}</div>
          <div style={{ color:'#6b6860', fontSize:13, textAlign:'center', maxWidth:300 }}>{description}</div>
          <span style={{ background:'#f0efe9', borderRadius:100, fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#9e9b94', padding:'4px 12px' }}>Coming Soon</span>
        </div>
      </Card>
    </div>
  )
}