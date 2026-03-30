'use client'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { id:'overview', label:'Overview', path:'/dashboard', icon:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
  { id:'time', label:'Time Capture', path:'/dashboard/time', icon:'M12 2v10l4 2M12 22a10 10 0 110-20 10 10 0 010 20z' },
  { id:'trends', label:'Trends', path:'/dashboard/trends', icon:'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
  { id:'learning', label:'Learning Register', path:'/dashboard/learning', icon:'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
]

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SidebarContent({ profile, pathname, onNav }: { profile: Profile; pathname: string; onNav: (path:string)=>void }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#1e2140' }}>
      <div style={{ padding:'16px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <img src='/cms-logo.png' alt='CM Solutions' style={{ width:100, objectFit:'contain', marginBottom:10 }} />
        <div style={{ fontWeight:800, fontSize:16, letterSpacing:-0.5, color:'#fff', textAlign:'center' }}>Work<span style={{ color:'#b4b93c' }}>IQ</span></div>
        <div style={{ fontSize:9, color:'rgba(168,176,208,0.5)', marginTop:2, letterSpacing:'0.08em', textTransform:'uppercase' }}>Current Release</div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px 10px', scrollbarWidth:'none' }}>
        <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', color:'#818cf8', padding:'8px 8px 6px', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:16, height:1, background:'#818cf8', display:'inline-block', opacity:0.6 }} />
          Core
        </div>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))
          return (
            <div key={item.id} onClick={() => onNav(item.path)}
              style={{
                display:'flex', alignItems:'center', gap:9,
                padding:'8px 10px', borderRadius:8, cursor:'pointer',
                marginBottom:2, fontSize:13, fontWeight:active?600:400,
                background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: active ? '#a5b4fc' : 'rgba(168,176,208,0.85)',
                borderLeft: active ? '2px solid #818cf8' : '2px solid transparent',
                transition:'all 0.12s',
              }}>
              <NavIcon d={item.icon} />
              {item.label}
            </div>
          )
        })}
      </div>

      <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{profile.name}</div>
        <div style={{ fontSize:11, color:'rgba(168,176,208,0.65)', marginTop:1 }}>{profile.role} | {profile.team}</div>
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

        <div style={{ display:'flex', flexDirection:'column' }}>
          {!isMobile && <div style={{ fontWeight:700, fontSize:14, color:'#1a1d2e' }}>WorkIQ</div>}
          {!isMobile && <div style={{ fontSize:11, color:'#6b7280' }}>Current scope: Time Capture, Trends, Learning Register</div>}
        </div>

        <div style={{ flex:1 }} />
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
              {NAV_ITEMS.map(item => {
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