'use client'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, CAN_INVOICE, CAN_SEE_PROFITABILITY } from '@/lib/types'
import { useEffect, useState } from 'react'
import NotificationBell from '@/components/NotificationBell'

const NAV_GROUPS = (role: string, canInvoice: boolean, canSeeProfitability: boolean, isElevated: boolean) => {
  type NavItem = { id: string; label: string; path: string; icon: string }
  type NavGroup = { section: string; items: NavItem[] }
  const groups: NavGroup[] = [
    { section: 'Core', items: [
      { id:'overview',   label:'Overview',           path:'/dashboard',             icon:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
      { id:'my',         label:'My Dashboard',       path:'/dashboard/my',          icon:'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
      { id:'time',       label:'Time Capture',        path:'/dashboard/time',        icon:'M12 2v10l4 2M12 22a10 10 0 110-20 10 10 0 010 20z' },
      { id:'timesheets', label:'Timesheets',          path:'/dashboard/timesheets',  icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { id:'leave',      label:'Leave & Absence',     path:'/dashboard/leave',       icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { id:'kpis',       label:'KPIs',                path:'/dashboard/kpis',        icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { id:'trends',     label:'Trends',              path:'/dashboard/trends',      icon:'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
      { id:'insights',   label:'AI Insights',         path:'/dashboard/insights',    icon:'M13 10V3L4 14h7v7l9-11h-7z' },
      { id:'decisions',  label:'Decisions & Actions', path:'/dashboard/decisions',   icon:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
      { id:'learning',   label:'Learning Register',   path:'/dashboard/learning',    icon:'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    ]},
    { section: 'Work', items: [
      { id:'projects', label:'Projects',        path:'/dashboard/projects', icon:'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z' },
      { id:'clients',  label:'Clients',         path:'/dashboard/clients',  icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
      { id:'goals',    label:'Goals & Targets', path:'/dashboard/goals',    icon:'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    ]},
    { section: 'Operational', items: [
      { id:'sop',        label:'SOP Adherence', path:'/dashboard/sop',        icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { id:'compliance', label:'Compliance',    path:'/dashboard/compliance',  icon:'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
      { id:'exceptions', label:'Exceptions',    path:'/dashboard/exceptions',  icon:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    ]},
    { section: 'Commercial', items: [
      ...(canInvoice ? [{ id:'invoicing', label:'Invoicing', path:'/dashboard/invoicing', icon:'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' }] : []),
      { id:'costing',       label:'Costing',         path:'/dashboard/costing',       icon:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      ...(canSeeProfitability ? [{ id:'profitability', label:'Profitability', path:'/dashboard/profitability', icon:'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' }] : []),
      { id:'audit', label:'Audit Reporting', path:'/dashboard/audit', icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    ]},
  ]
  if (isElevated) groups.splice(1, 0, { section: 'Management', items: [
    { id:'executive', label:'Executive Dashboard', path:'/dashboard/executive', icon:'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ]})
  if (role === 'Admin') groups.push({ section: 'Admin', items: [
    { id:'admin-users',          label:'Users & Roles',      path:'/dashboard/admin-users',          icon:'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id:'admin-kpi',            label:'KPI Rules',          path:'/dashboard/admin-kpi',            icon:'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
    { id:'admin-org',            label:'Organisation',       path:'/dashboard/admin-org',            icon:'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id:'admin-accountability', label:'Accountability Map', path:'/dashboard/admin-accountability', icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  ]})
  return groups
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SidebarContent({ profile, pathname, onNav }: { profile: Profile; pathname: string; onNav: (path:string)=>void }) {
  const role = profile.role
  const groups = NAV_GROUPS(role, CAN_INVOICE.includes(role), CAN_SEE_PROFITABILITY.includes(role), ['Manager','Executive','Admin'].includes(role))
  const sectionColors: Record<string,string> = {
    Core:'#818cf8', Management:'#34d399', Work:'#38bdf8',
    Operational:'#fb923c', Commercial:'#f472b6', Admin:'#f87171',
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#1e2140' }}>
      <div style={{ padding:'16px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <img src='/cms-logo.png' alt='CM Solutions' style={{ width:100, objectFit:'contain', marginBottom:10 }} />
        <div style={{ fontWeight:800, fontSize:16, letterSpacing:-0.5, color:'#fff', textAlign:'center' }}>Work<span style={{ color:'#b4b93c' }}>IQ</span></div>
        <div style={{ fontSize:9, color:'rgba(168,176,208,0.5)', marginTop:2, letterSpacing:'0.08em', textTransform:'uppercase' }}>Work Intelligence System</div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'8px 10px', scrollbarWidth:'none' }}>
        {groups.map(group => (
          <div key={group.section} style={{ marginBottom:2 }}>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', color:sectionColors[group.section]||'#4a5080', padding:'12px 8px 5px', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:16, height:1, background:sectionColors[group.section]||'#4a5080', display:'inline-block', opacity:0.6 }} />
              {group.section}
            </div>
            {group.items.map(item => {
              const active = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))
              return (
                <div key={item.id} onClick={() => onNav(item.path)}
                  style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:8, cursor:'pointer', marginBottom:1, fontSize:13, fontWeight:active?600:400,
                    background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color: active ? '#a5b4fc' : 'rgba(168,176,208,0.8)',
                    borderLeft: active ? '2px solid #818cf8' : '2px solid transparent',
                    transition:'all 0.12s' }}>
                  <NavIcon d={item.icon} />
                  {item.label}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{profile.name}</div>
        <div style={{ fontSize:11, color:'rgba(168,176,208,0.6)', marginTop:1 }}>{profile.role} ? {profile.team}</div>
      </div>
    </div>
  )
}

export default function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  async function signOut() {
    await supabase.auth.signOut(); router.push('/login'); router.refresh()
  }

  function navigate(path: string) {
    router.push(path); if (isMobile) setSidebarOpen(false)
  }

  const rolePill: Record<string,{bg:string;color:string}> = {
    Admin:          { bg:'#fee2e2', color:'#dc2626' },
    Executive:      { bg:'#fef3c7', color:'#d97706' },
    Manager:        { bg:'#eef2ff', color:'#6366f1' },
    'Project Lead': { bg:'#ede9fe', color:'#7c3aed' },
    Employee:       { bg:'#f3f4f6', color:'#6b7280' },
  }
  const pill = rolePill[profile.role] || rolePill.Employee
  const SIDEBAR_W = sidebarCollapsed ? 60 : 232

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'#f4f6fb' }}>
      <div style={{ height:58, background:'#fff', borderBottom:'1px solid #e8eaf2', display:'flex', alignItems:'center', padding:'0 16px', gap:12, flexShrink:0, zIndex:100, boxShadow:'0 1px 4px rgba(30,33,64,0.06)' }}>
        <button onClick={() => isMobile ? setSidebarOpen(!sidebarOpen) : setSidebarCollapsed(!sidebarCollapsed)}
          style={{ background:'#f4f6fb', border:'1px solid #e8eaf2', borderRadius:8, width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        {isMobile && <div style={{ fontWeight:800, fontSize:17, letterSpacing:-0.5, color:'#1a1d2e' }}>Work<span style={{ color:'#b4b93c' }}>IQ</span></div>}
        <div style={{ flex:1 }} />
        <NotificationBell />
        {!isMobile && (
          <>
            <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', padding:'4px 12px', borderRadius:100, fontWeight:700, ...pill }}>{profile.role}</span>
            <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>{profile.name}</span>
          </>
        )}
        <button onClick={signOut} style={{ fontFamily:'inherit', fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:7, border:'1px solid #e8eaf2', background:'#f4f6fb', cursor:'pointer', color:'#6b7280' }}>
          {isMobile ? 'Out' : 'Sign out'}
        </button>
      </div>
      <div style={{ display:'flex', flex:1, overflow:'hidden', position:'relative' }}>
        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(15,17,35,0.5)', zIndex:199, backdropFilter:'blur(3px)' }} />
        )}
        <div style={{ width: isMobile ? 252 : SIDEBAR_W, flexShrink:0, overflowY:'auto', overflowX:'hidden',
          transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)', zIndex: isMobile ? 200 : 10,
          position: isMobile ? 'fixed' : 'relative', top: isMobile ? 58 : 0, bottom:0,
          left: isMobile ? (sidebarOpen ? 0 : -260) : 0,
          boxShadow: isMobile && sidebarOpen ? '8px 0 32px rgba(0,0,0,0.25)' : 'none' }}>
          {!isMobile && sidebarCollapsed ? (
            <div style={{ background:'#1e2140', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 0', gap:4 }}>
              <div style={{ fontWeight:800, fontSize:14, color:'#818cf8', marginBottom:12 }}>W</div>
              {NAV_GROUPS(profile.role, CAN_INVOICE.includes(profile.role), CAN_SEE_PROFITABILITY.includes(profile.role), ['Manager','Executive','Admin'].includes(profile.role))
                .flatMap(g => g.items).map(item => {
                  const active = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))
                  return (
                    <div key={item.id} onClick={() => navigate(item.path)} title={item.label}
                      style={{ width:40, height:40, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
                        background: active?'rgba(99,102,241,0.2)':'transparent',
                        color: active?'#a5b4fc':'rgba(168,176,208,0.5)', transition:'all 0.12s' }}>
                      <NavIcon d={item.icon} />
                    </div>
                  )
                })}
            </div>
          ) : (
            <SidebarContent profile={profile} pathname={pathname} onNav={navigate} />
          )}
        </div>
        <div style={{ flex:1, overflowY:'auto', background:'#f4f6fb' }}>
          {isMobile && (
            <div style={{ background:'#fff', borderBottom:'1px solid #f0f2f8', padding:'8px 16px', display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:11, fontFamily:'DM Mono,monospace', padding:'3px 10px', borderRadius:100, fontWeight:700, ...pill }}>{profile.role}</span>
              <span style={{ fontSize:12, color:'#6b7280' }}>{profile.name}</span>
            </div>
          )}
          <div style={{ padding: isMobile ? '16px' : '28px 32px' }}>{children}</div>
        </div>
      </div>
    </div>
  )
}


