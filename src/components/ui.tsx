'use client'
import React from 'react'

export const theme = {
  bg: '#f5f7fb',
  bgSoft: '#eef2f8',
  surface: '#ffffff',
  surface2: '#fafbff',
  surface3: '#f3f6fb',
  border: '#e6ebf3',
  border2: '#edf1f7',
  text: '#141b2d',
  text2: '#5f6b85',
  text3: '#98a2b3',
  accent: '#5b5ce2',
  accent2: '#7c7ff0',
  accentLight: '#eef0ff',
  accentDark: '#4748c8',
  teal: '#0ea5e9',
  tealLight: '#e7f7ff',
  green: '#059669',
  greenLight: '#dcfce7',
  amber: '#d97706',
  amberLight: '#fef3c7',
  red: '#dc2626',
  redLight: '#fee2e2',
  purple: '#7c3aed',
  purpleLight: '#f1e8ff',
  sidebar: '#171b36',
  sidebar2: '#202652',
  sidebarText: '#b8c1e0',
  sidebarTextSoft: '#8f99bc',
  sidebarActive: '#ffffff',
  sidebarActiveBg: 'linear-gradient(135deg, rgba(91,92,226,0.28), rgba(124,127,240,0.18))',
  shadow: '0 10px 30px rgba(20,27,45,0.06)',
  shadowSm: '0 4px 14px rgba(20,27,45,0.05)',
}

export function Card({ children, style, accent }: { children: React.ReactNode; style?: React.CSSProperties; accent?: string }) {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg,#ffffff 0%,#fbfcff 100%)',
        border: '1px solid ' + theme.border,
        borderRadius: 18,
        padding: 22,
        boxShadow: theme.shadowSm,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {accent && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: accent,
            borderRadius: '18px 18px 0 0',
          }}
        />
      )}
      {children}
    </div>
  )
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: theme.accent,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span
        style={{
          width: 4,
          height: 12,
          background: 'linear-gradient(180deg,' + theme.accent + ',' + theme.accent2 + ')',
          borderRadius: 999,
          display: 'inline-block',
        }}
      />
      {children}
    </div>
  )
}

export function KpiCard({ label, value, sub, flag, color }: {
  label: string; value: string | number; sub?: string;
  flag?: { text: string; level: 'red'|'amber'|'green'|'blue' };
  color?: string;
}) {
  const flagMap = {
    red:   { bg: theme.redLight, color: theme.red },
    amber: { bg: theme.amberLight, color: theme.amber },
    green: { bg: theme.greenLight, color: theme.green },
    blue:  { bg: theme.accentLight, color: theme.accent },
  }

  const bar = color || theme.accent

  return (
    <div
      style={{
        background: 'linear-gradient(180deg,#ffffff 0%,#fbfcff 100%)',
        border: '1px solid ' + theme.border,
        borderRadius: 18,
        padding: '20px 22px',
        boxShadow: theme.shadowSm,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 126,
      }}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background: bar, borderRadius:'18px 18px 0 0' }} />
      <div style={{ position:'absolute', top:-14, right:-14, width:92, height:92, borderRadius:'50%', background: bar, opacity:0.06 }} />
      <div style={{ fontSize:10, fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:theme.text3, marginBottom:12 }}>{label}</div>
      <div style={{ fontSize:32, fontWeight:900, letterSpacing:-1.1, fontFamily:'DM Mono,monospace', color:theme.text, lineHeight:1.05 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:theme.text2, marginTop:8, lineHeight:1.45 }}>{sub}</div>}
      {flag && (
        <span
          style={{
            ...flagMap[flag.level],
            fontSize:11,
            fontWeight:700,
            padding:'4px 10px',
            borderRadius:999,
            display:'inline-block',
            marginTop:10
          }}
        >
          {flag.text}
        </span>
      )}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 30,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, color: theme.text, lineHeight: 1.05 }}>
          {title}
        </div>
        {subtitle && <div style={{ color: theme.text2, fontSize: 13, marginTop: 7, lineHeight: 1.55 }}>{subtitle}</div>}
      </div>
      {action && <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>{action}</div>}
    </div>
  )
}

export function Btn({ children, onClick, primary, danger, disabled, small, style }: {
  children: React.ReactNode; onClick?: () => void; primary?: boolean; danger?: boolean;
  disabled?: boolean; small?: boolean; style?: React.CSSProperties
}) {
  const base: React.CSSProperties = {
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: small ? 12 : 13,
    padding: small ? '6px 12px' : '10px 18px',
    borderRadius: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    whiteSpace: 'nowrap',
    transition: 'all 0.16s ease',
    border: '1px solid transparent',
    outline: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: small ? 32 : 40,
  }

  const vars = {
    primary: {
      background: 'linear-gradient(135deg,' + theme.accent + ',' + theme.accentDark + ')',
      color: '#fff',
      boxShadow: '0 10px 22px rgba(91,92,226,0.22)',
    },
    danger: {
      background: '#fff',
      color: theme.red,
      border: '1px solid rgba(220,38,38,0.18)',
      boxShadow: '0 2px 8px rgba(220,38,38,0.06)',
    },
    default: {
      background: '#fff',
      color: theme.text2,
      border: '1px solid ' + theme.border,
      boxShadow: '0 2px 8px rgba(20,27,45,0.04)',
    },
  }

  const v = primary ? vars.primary : danger ? vars.danger : vars.default
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...v, ...style }}>{children}</button>
}

export function Badge({ text, type }: { text: string; type?: 'blue'|'green'|'amber'|'red'|'purple'|'teal'|'gray' }) {
  const map: Record<string,{bg:string;color:string}> = {
    blue:   { bg: theme.accentLight, color: theme.accent },
    green:  { bg: theme.greenLight, color: theme.green },
    amber:  { bg: theme.amberLight, color: theme.amber },
    red:    { bg: theme.redLight, color: theme.red },
    purple: { bg: theme.purpleLight, color: theme.purple },
    teal:   { bg: theme.tealLight, color: theme.teal },
    gray:   { bg: '#f3f6fb', color: theme.text2 },
  }

  const c = map[type || 'gray']
  return (
    <span
      style={{
        ...c,
        fontSize: 11,
        fontWeight: 800,
        padding: '4px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        display: 'inline-block',
        letterSpacing: '0.02em',
      }}
    >
      {text}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string,'blue'|'amber'|'green'> = { 'Open':'blue', 'In Progress':'amber', 'Done':'green' }
  return <Badge text={status} type={map[status] || 'gray'} />
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string,'red'|'amber'|'green'> = { High:'red', Med:'amber', Low:'green' }
  return <Badge text={severity} type={map[severity] || 'gray'} />
}

export function Table({ heads, children, empty }: { heads: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div style={{ overflowX:'auto', border:'1px solid ' + theme.border2, borderRadius:16 }}>
      <table style={{ width:'100%', borderCollapse:'collapse', background:'#fff' }}>
        <thead>
          <tr style={{ background:'linear-gradient(90deg,#f7f9fd,#fbfcff)' }}>
            {heads.map(h => (
              <th
                key={h}
                style={{
                  textAlign:'left',
                  fontSize:10,
                  fontWeight:800,
                  letterSpacing:'0.12em',
                  textTransform:'uppercase',
                  color:theme.accent,
                  padding:'12px 14px',
                  borderBottom:'1px solid ' + theme.border,
                }}
              >
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
    <td
      style={{
        padding:'12px 14px',
        borderBottom:'1px solid ' + theme.border2,
        fontSize:13,
        verticalAlign:'middle',
        color:theme.text,
        ...style
      }}
    >
      {children}
    </td>
  )
}

export function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      <label style={{ fontSize:12, fontWeight:700, color:theme.text2, letterSpacing:'0.02em' }}>{label}</label>
      {children}
    </div>
  )
}

export const inputStyle: React.CSSProperties = {
  fontFamily:'inherit',
  fontSize:13,
  padding:'10px 12px',
  border:'1px solid ' + theme.border,
  borderRadius:12,
  background:'#fbfcff',
  color:theme.text,
  width:'100%',
  outline:'none',
  transition:'border-color 0.15s, box-shadow 0.15s',
  boxShadow:'inset 0 1px 2px rgba(20,27,45,0.02)',
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
          <div style={{ width:58, height:58, background:'linear-gradient(135deg,#eef0ff,#f3f5ff)', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 10px 24px rgba(91,92,226,0.12)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#5b5ce2" strokeWidth="1.5"/><path d="M8 12h8M8 8h5M8 16h3" stroke="#5b5ce2" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <div style={{ fontWeight:900, fontSize:16, color:theme.text }}>{title}</div>
          <div style={{ color:theme.text2, fontSize:13, textAlign:'center', maxWidth:320, lineHeight:1.6 }}>{description}</div>
          <span style={{ background:'linear-gradient(135deg,#eef0ff,#f3f5ff)', color:theme.accent, borderRadius:999, fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 16px' }}>Coming Soon</span>
        </div>
      </Card>
    </div>
  )
}
