'use client'
import React from 'react'

export const theme = {
  bg: '#f4f6fb',
  surface: '#ffffff',
  surface2: '#f8f9fc',
  surface3: '#f0f2f8',
  border: '#e8eaf2',
  border2: '#f0f2f8',
  text: '#1a1d2e',
  text2: '#6b7280',
  text3: '#a0a8c0',
  accent: '#6366f1',
  accentLight: '#eef2ff',
  accentDark: '#4f46e5',
  teal: '#0ea5e9',
  tealLight: '#e0f2fe',
  green: '#059669',
  greenLight: '#d1fae5',
  amber: '#d97706',
  amberLight: '#fef3c7',
  red: '#dc2626',
  redLight: '#fee2e2',
  purple: '#7c3aed',
  purpleLight: '#ede9fe',
  sidebar: '#1e2140',
  sidebarText: '#a8b0d0',
  sidebarActive: '#6366f1',
  sidebarActiveBg: 'rgba(99,102,241,0.15)',
  sidebarSection: '#4a5080',
}

export function Card({ children, style, accent }: { children: React.ReactNode; style?: React.CSSProperties; accent?: string }) {
  return (
    <div style={{
      background: theme.surface,
      border: '1px solid ' + theme.border,
      borderRadius: 12,
      padding: 22,
      boxShadow: '0 1px 3px rgba(30,33,64,0.06), 0 4px 16px rgba(30,33,64,0.04)',
      position: 'relative',
      overflow: 'hidden',
      ...style
    }}>
      {accent && <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:accent, borderRadius:'12px 12px 0 0' }} />}
      {children}
    </div>
  )
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:theme.accent, marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
      <span style={{ width:3, height:11, background:theme.accent, borderRadius:2, display:'inline-block', opacity:0.6 }} />
      {children}
    </div>
  )
}

const KPI_COLORS = [
  'linear-gradient(135deg,#6366f1,#818cf8)',
  'linear-gradient(135deg,#0ea5e9,#38bdf8)',
  'linear-gradient(135deg,#059669,#34d399)',
  'linear-gradient(135deg,#d97706,#fbbf24)',
  'linear-gradient(135deg,#7c3aed,#a78bfa)',
  'linear-gradient(135deg,#dc2626,#f87171)',
]
let kpiColorIndex = 0

export function KpiCard({ label, value, sub, flag, color }: {
  label: string; value: string | number; sub?: string;
  flag?: { text: string; level: 'red'|'amber'|'green'|'blue' };
  color?: string;
}) {
  const flagMap = {
    red:   { bg: theme.redLight,    color: theme.red },
    amber: { bg: theme.amberLight,  color: theme.amber },
    green: { bg: theme.greenLight,  color: theme.green },
    blue:  { bg: theme.accentLight, color: theme.accent },
  }
  const bar = color || theme.accent
  return (
    <div style={{ background: theme.surface, border:'1px solid ' + theme.border, borderRadius:12, padding:'20px 22px', boxShadow:'0 1px 4px rgba(30,33,64,0.07)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background: bar, borderRadius:'12px 12px 0 0' }} />
      <div style={{ position:'absolute', top:0, right:0, width:64, height:64, borderRadius:'0 12px 0 64px', background: bar, opacity:0.06 }} />
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:theme.text3, marginBottom:10 }}>{label}</div>
      <div style={{ fontSize:30, fontWeight:800, letterSpacing:-1, fontFamily:'DM Mono,monospace', color:theme.text }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:theme.text2, marginTop:5 }}>{sub}</div>}
      {flag && <span style={{ ...flagMap[flag.level], fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:100, display:'inline-block', marginTop:9 }}>{flag.text}</span>}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ marginBottom:28, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
      <div>
        <div style={{ fontSize:24, fontWeight:800, letterSpacing:-0.5, color:theme.text }}>{title}</div>
        {subtitle && <div style={{ color:theme.text2, fontSize:13, marginTop:4 }}>{subtitle}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function Btn({ children, onClick, primary, danger, disabled, small, style }: {
  children: React.ReactNode; onClick?: () => void; primary?: boolean; danger?: boolean;
  disabled?: boolean; small?: boolean; style?: React.CSSProperties
}) {
  const base: React.CSSProperties = {
    fontFamily:'inherit', fontWeight:600,
    fontSize: small ? 12 : 13,
    padding: small ? '4px 11px' : '8px 18px',
    borderRadius:7, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, whiteSpace:'nowrap',
    transition:'all 0.15s', border:'none',
  }
  const vars = {
    primary: { background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', boxShadow:'0 2px 8px rgba(99,102,241,0.35)' },
    danger:  { background: theme.redLight, color: theme.red, border:'1px solid rgba(220,38,38,0.2)' },
    default: { background: theme.surface, color: theme.text2, border:'1px solid ' + theme.border, boxShadow:'0 1px 2px rgba(30,33,64,0.06)' },
  }
  const v = primary ? vars.primary : danger ? vars.danger : vars.default
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...v, ...style }}>{children}</button>
}

export function Badge({ text, type }: { text: string; type?: 'blue'|'green'|'amber'|'red'|'purple'|'teal'|'gray' }) {
  const map: Record<string,{bg:string;color:string}> = {
    blue:   { bg: theme.accentLight, color: theme.accent },
    green:  { bg: theme.greenLight,  color: theme.green },
    amber:  { bg: theme.amberLight,  color: theme.amber },
    red:    { bg: theme.redLight,    color: theme.red },
    purple: { bg: theme.purpleLight, color: theme.purple },
    teal:   { bg: theme.tealLight,   color: theme.teal },
    gray:   { bg: '#f0f2f8',         color: theme.text2 },
  }
  const c = map[type||'gray']
  return (
    <span style={{ ...c, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:100, whiteSpace:'nowrap', display:'inline-block', letterSpacing:'0.03em' }}>
      {text}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string,'blue'|'amber'|'green'> = { 'Open':'blue', 'In Progress':'amber', 'Done':'green' }
  return <Badge text={status} type={map[status]||'gray'} />
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string,'red'|'amber'|'green'> = { High:'red', Med:'amber', Low:'green' }
  return <Badge text={severity} type={map[severity]||'gray'} />
}

export function Table({ heads, children, empty }: { heads: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ background:'linear-gradient(90deg,#f4f6fb,#f8f9fc)' }}>
            {heads.map(h => (
              <th key={h} style={{ textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:theme.accent, padding:'10px 14px', borderBottom:'2px solid ' + theme.border }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && <div style={{ textAlign:'center', color:theme.text3, padding:48, fontSize:13 }}>No records found.</div>}
    </div>
  )
}

export function Td({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding:'11px 14px', borderBottom:'1px solid ' + theme.border2, fontSize:13, verticalAlign:'middle', color:theme.text, ...style }}>
      {children}
    </td>
  )
}

export function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:12, fontWeight:600, color:theme.text2, letterSpacing:'0.02em' }}>{label}</label>
      {children}
    </div>
  )
}

export const inputStyle: React.CSSProperties = {
  fontFamily:'inherit', fontSize:13, padding:'9px 12px',
  border:'1px solid #e8eaf2', borderRadius:7,
  background:'#f8f9fc', color:'#1a1d2e', width:'100%', outline:'none',
  transition:'border-color 0.15s',
}

export function EmptyState({ message }: { message: string }) {
  return <div style={{ textAlign:'center', color:theme.text3, padding:48, fontSize:13 }}>{message}</div>
}

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:280, gap:14 }}>
          <div style={{ width:56, height:56, background:'linear-gradient(135deg,#eef2ff,#e0e7ff)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(99,102,241,0.15)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#6366f1" strokeWidth="1.5"/><path d="M8 12h8M8 8h5M8 16h3" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <div style={{ fontWeight:800, fontSize:16, color:theme.text }}>{title}</div>
          <div style={{ color:theme.text2, fontSize:13, textAlign:'center', maxWidth:300, lineHeight:1.6 }}>{description}</div>
          <span style={{ background:'linear-gradient(135deg,#eef2ff,#e0e7ff)', color:theme.accent, borderRadius:100, fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', padding:'6px 16px' }}>Coming Soon</span>
        </div>
      </Card>
    </div>
  )
}
