'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/lib/types'
import { useRouter } from 'next/navigation'

export default function NotificationBell() {
  const supabase = createClient()
  const router = useRouter()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('notifications').select('*')
      .eq('user_id', user.id).order('created_at', { ascending:false }).limit(20)
    setNotifs(data || [])
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [])

  async function markRead(id: string, link: string) {
    await supabase.from('notifications').update({ read:true }).eq('id', id)
    load()
    setOpen(false)
    if (link) router.push(link)
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ read:true }).eq('user_id', user.id).eq('read', false)
    load()
  }

  const unread = notifs.filter(n => !n.read).length
  const typeColor: Record<string,string> = { info:'#6366f1', warning:'#d97706', success:'#059669', error:'#dc2626' }
  const typeBg: Record<string,string> = { info:'#eef2ff', warning:'#fef3c7', success:'#d1fae5', error:'#fee2e2' }

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(!open)}
        style={{ position:'relative', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        {unread > 0 && (
          <span style={{ position:'absolute', top:-4, right:-4, background:'#dc2626', color:'#fff', fontSize:9, fontWeight:700, width:16, height:16, borderRadius:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:200 }} />
          <div style={{ position:'absolute', right:0, top:44, width:340, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', zIndex:201, overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:700, fontSize:14 }}>Notifications</span>
              {unread > 0 && <button onClick={markAllRead} style={{ fontSize:12, color:'#6366f1', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Mark all read</button>}
            </div>
            <div style={{ maxHeight:360, overflowY:'auto' }}>
              {notifs.length === 0 ? (
                <div style={{ padding:32, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No notifications yet</div>
              ) : notifs.map(n => (
                <div key={n.id} onClick={() => markRead(n.id, n.link)}
                  style={{ padding:'12px 16px', borderBottom:'1px solid #f9fafb', cursor:'pointer', background: n.read ? '#fff' : '#fafbff', display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ width:8, height:8, borderRadius:100, background: n.read ? 'transparent' : typeColor[n.type]||'#6366f1', marginTop:5, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight: n.read ? 400 : 600, color:'#111827' }}>{n.title}</div>
                    <div style={{ fontSize:12, color:'#6b7280', marginTop:2, lineHeight:1.4 }}>{n.body}</div>
                    <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
