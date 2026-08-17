'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'

type NavItem = {
  id: string
  label: string
  path: string
  icon: string
  managerOnly?: boolean
}

type SidebarContentProps = {
  profile: Profile
  pathname: string
  onNav: (path: string) => void
}

type AppShellProps = {
  profile: Profile
  children: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    path: '/dashboard',
    icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z'
  },
  {
    id: 'time',
    label: 'Time Capture',
    path: '/dashboard/time',
    icon: 'M12 2v10l4 2M12 22a10 10 0 110-20 10 10 0 010 20z'
  },
  {
    id: 'trends',
    label: 'Trends',
    path: '/dashboard/trends',
    icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z'
  },
  {
    id: 'learning',
    label: 'Learning Register',
    path: '/dashboard/learning',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
  },
  {
    id: 'manage',
    label: 'Manage Lists',
    path: '/dashboard/manage',
    icon: 'M4 6h16M4 12h16M4 18h16M8 4v4M14 10v4M10 16v4',
    managerOnly: true
  },
]

function NavIcon(props: { d: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path
        d={props.d}
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SidebarContent(props: SidebarContentProps) {
  const {
    profile,
    pathname,
    onNav
  } = props

  const canManage =
    profile.role === 'Manager' ||
    profile.role === 'Admin'

  const visibleItems =
    NAV_ITEMS.filter(
      item =>
        !item.managerOnly ||
        canManage
    )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background:
          'linear-gradient(180deg,#171b36 0%,#1f2550 100%)',
      }}
    >
      <div
        style={{
          padding: '22px 18px 18px',
          borderBottom:
            '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 114,
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <img
            src="/cms-logo.png"
            alt="CM Solutions"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        </div>

        <div
          style={{
            fontWeight: 900,
            fontSize: 18,
            letterSpacing: -0.4,
            color: '#fff',
          }}
        >
          Work
          <span style={{ color: '#b4b93c' }}>
            IQ
          </span>
        </div>

        <div
          style={{
            fontSize: 10,
            color:
              'rgba(184,193,224,0.62)',
            marginTop: 5,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          PR Work Intelligence
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 12px',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#8b92ff',
            padding: '10px 10px 8px',
          }}
        >
          PR Workspace
        </div>

        {visibleItems.map(item => {
          const active =
            pathname === item.path ||
            (
              item.path !== '/dashboard' &&
              pathname.startsWith(item.path)
            )

          return (
            <div
              key={item.id}
              onClick={() =>
                onNav(item.path)
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 12px',
                borderRadius: 14,
                cursor: 'pointer',
                marginBottom: 6,
                fontSize: 13,
                fontWeight:
                  active ? 700 : 500,
                background:
                  active
                    ? 'linear-gradient(135deg, rgba(91,92,226,0.32), rgba(124,127,240,0.18))'
                    : 'transparent',
                color:
                  active
                    ? '#ffffff'
                    : 'rgba(184,193,224,0.92)',
                border:
                  active
                    ? '1px solid rgba(124,127,240,0.28)'
                    : '1px solid transparent',
              }}
            >
              <NavIcon d={item.icon} />
              {item.label}
            </div>
          )
        })}
      </div>

      <div
        style={{
          padding: '14px 16px',
          borderTop:
            '1px solid rgba(255,255,255,0.08)',
          background:
            'rgba(0,0,0,0.14)',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#eef2ff',
          }}
        >
          {profile.name}
        </div>

        <div
          style={{
            fontSize: 11,
            color:
              'rgba(184,193,224,0.72)',
            marginTop: 3,
          }}
        >
          {profile.role} | {profile.team}
        </div>
      </div>
    </div>
  )
}

export default function AppShell(
  props: AppShellProps
) {
  const {
    profile,
    children
  } = props

  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [sidebarOpen, setSidebarOpen] =
    useState(false)

  const [
    sidebarCollapsed,
    setSidebarCollapsed
  ] = useState(false)

  const [isMobile, setIsMobile] =
    useState(false)

  useEffect(() => {
    function check() {
      setIsMobile(
        window.innerWidth < 768
      )
    }

    check()

    window.addEventListener(
      'resize',
      check
    )

    return () =>
      window.removeEventListener(
        'resize',
        check
      )
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  async function signOut() {
    await supabase.auth.signOut()

    router.push('/login')
    router.refresh()
  }

  function navigate(path: string) {
    router.push(path)

    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const canManage =
    profile.role === 'Manager' ||
    profile.role === 'Admin'

  const visibleItems =
    NAV_ITEMS.filter(
      item =>
        !item.managerOnly ||
        canManage
    )

  const rolePill:
    Record<
      string,
      {
        bg: string
        color: string
      }
    > = {
      Admin: {
        bg: '#fee2e2',
        color: '#dc2626',
      },
      Executive: {
        bg: '#fef3c7',
        color: '#d97706',
      },
      Manager: {
        bg: '#eef2ff',
        color: '#5b5ce2',
      },
      'Project Lead': {
        bg: '#f3e8ff',
        color: '#7c3aed',
      },
      Employee: {
        bg: '#f3f6fb',
        color: '#6b7280',
      },
    }

  const pill =
    rolePill[profile.role] ||
    rolePill.Employee

  const sidebarWidth =
    sidebarCollapsed
      ? 76
      : 248

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: '#f5f7fb',
      }}
    >
      <div
        style={{
          height: 64,
          background:
            'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom:
            '1px solid #e6ebf3',
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px',
          gap: 12,
          flexShrink: 0,
          zIndex: 100,
          boxShadow:
            '0 6px 24px rgba(20,27,45,0.04)',
        }}
      >
        <button
          onClick={() =>
            isMobile
              ? setSidebarOpen(
                  !sidebarOpen
                )
              : setSidebarCollapsed(
                  !sidebarCollapsed
                )
          }
          style={{
            background: '#fff',
            border:
              '1px solid #e6ebf3',
            borderRadius: 12,
            width: 40,
            height: 40,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="#5b5ce2"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {isMobile && (
          <div
            style={{
              fontWeight: 900,
              fontSize: 18,
              color: '#141b2d',
            }}
          >
            Work
            <span
              style={{
                color: '#b4b93c'
              }}
            >
              IQ
            </span>
          </div>
        )}

        {!isMobile && (
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 15,
                color: '#141b2d',
              }}
            >
              WorkIQ
            </div>

            <div
              style={{
                fontSize: 12,
                color: '#6b7280',
              }}
            >
              PR Department
            </div>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {!isMobile && (
          <>
            <span
              style={{
                fontSize: 11,
                fontFamily:
                  'DM Mono,monospace',
                padding: '5px 12px',
                borderRadius: 999,
                fontWeight: 800,
                background: pill.bg,
                color: pill.color,
              }}
            >
              {profile.role}
            </span>

            <span
              style={{
                fontSize: 13,
                color: '#374151',
                fontWeight: 600,
              }}
            >
              {profile.name}
            </span>
          </>
        )}

        <button
          onClick={signOut}
          style={{
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 700,
            padding: '9px 14px',
            borderRadius: 12,
            border:
              '1px solid #e6ebf3',
            background: '#fff',
            cursor: 'pointer',
            color: '#6b7280',
          }}
        >
          {isMobile
            ? 'Out'
            : 'Sign out'}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {isMobile &&
          sidebarOpen && (
            <div
              onClick={() =>
                setSidebarOpen(false)
              }
              style={{
                position: 'fixed',
                inset: 0,
                background:
                  'rgba(10,14,28,0.46)',
                zIndex: 199,
                backdropFilter:
                  'blur(4px)',
              }}
            />
          )}

        <div
          style={{
            width:
              isMobile
                ? 268
                : sidebarWidth,
            flexShrink: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            transition:
              'all 0.25s cubic-bezier(0.4,0,0.2,1)',
            zIndex:
              isMobile ? 200 : 10,
            position:
              isMobile
                ? 'fixed'
                : 'relative',
            top:
              isMobile ? 64 : 0,
            bottom: 0,
            left:
              isMobile
                ? sidebarOpen
                  ? 0
                  : -280
                : 0,
          }}
        >
          {!isMobile &&
          sidebarCollapsed ? (
            <div
              style={{
                background:
                  'linear-gradient(180deg,#171b36 0%,#1f2550 100%)',
                height: '100%',
                display: 'flex',
                flexDirection:
                  'column',
                alignItems: 'center',
                padding: '16px 0',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background:
                    'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  fontWeight: 900,
                  color: '#fff',
                  marginBottom: 8,
                }}
              >
                W
              </div>

              {visibleItems.map(item => {
                const active =
                  pathname ===
                    item.path ||
                  (
                    item.path !==
                      '/dashboard' &&
                    pathname.startsWith(
                      item.path
                    )
                  )

                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      navigate(
                        item.path
                      )
                    }
                    title={item.label}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      display: 'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      cursor:
                        'pointer',
                      background:
                        active
                          ? 'rgba(91,92,226,0.34)'
                          : 'transparent',
                      color:
                        active
                          ? '#fff'
                          : 'rgba(184,193,224,0.7)',
                    }}
                  >
                    <NavIcon
                      d={item.icon}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <SidebarContent
              profile={profile}
              pathname={pathname}
              onNav={navigate}
            />
          )}
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: '#f5f7fb',
          }}
        >
          <div
            style={{
              padding:
                isMobile
                  ? '16px'
                  : '30px 34px',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
