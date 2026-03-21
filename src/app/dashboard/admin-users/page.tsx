'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, ALL_ROLES } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, Table, Td, Badge, inputStyle } from '@/components/ui'

const ROLE_COLORS: Record<string,'red'|'amber'|'blue'|'green'|'gray'> = {
  Admin:'red', Executive:'amber', Manager:'blue', 'Project Lead':'green', Employee:'gray',
}

export default function AdminUsersPage() {
  const supabase = createClient()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [editing, setEditing] = useState<string|null>(null)
  const [editRate, setEditRate] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editTeam, setEditTeam] = useState('')
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null)
  const [deleting, setDeleting] = useState(false)

  const TEAMS = [
    'Analytical Department','Lab Management Department','Metallurgical Department',
    'Consulting Department','Admin Department','Management','PR Department','Executive','General',
  ]

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('name')
    setProfiles(data || [])
  }, [])

  useEffect(() => { load() }, [])

  async function saveUser(id: string) {
    const { error } = await supabase.from('profiles').update({
      hourly_rate: parseFloat(editRate)||0, role: editRole as any, team: editTeam,
    }).eq('id', id)
    if (error) { setMsg('Error: ' + error.message); return }
    await load()
    setEditing(null)
    setMsg('User updated.'); setTimeout(() => setMsg(''), 3000)
  }

  async function deleteUser(id: string) {
    setDeleting(true)
    const { error: profileErr } = await supabase.from('profiles').delete().eq('id', id)
    if (profileErr) { setMsg('Error deleting profile: ' + profileErr.message); setDeleting(false); return }
    setDeleteConfirm(null)
    setDeleting(false)
    setMsg('User removed from the system.')
    await load()
    setTimeout(() => setMsg(''), 4000)
  }

  function startEdit(p: Profile) {
    setEditing(p.id); setEditRate(String(p.hourly_rate||'')); setEditRole(p.role); setEditTeam(p.team)
  }

  const filtered = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.role.toLowerCase().includes(search.toLowerCase()) ||
    p.team.toLowerCase().includes(search.toLowerCase())
  )

  const roleCounts = ALL_ROLES.map(r => ({ role:r, count:profiles.filter(p=>p.role===r).length }))

  return (
    <div>
      <PageHeader title="Users & Roles" subtitle="Manage workspace members, roles, teams, hourly rates, and access." />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
        {roleCounts.map(({ role, count }) => (
          <div key={role} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'#6366f1', borderRadius:'12px 12px 0 0' }} />
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#a0a8c0', marginBottom:6 }}>{role}</div>
            <div style={{ fontSize:26, fontWeight:800, fontFamily:'DM Mono,monospace', color:'#6366f1' }}>{count}</div>
          </div>
        ))}
      </div>

      {msg && (
        <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, fontSize:13, fontWeight:500,
          background: msg.startsWith('Error') ? '#fee2e2' : '#d1fae5',
          color: msg.startsWith('Error') ? '#dc2626' : '#059669' }}>
          {msg}
        </div>
      )}

      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <CardTitle>All Users ({filtered.length})</CardTitle>
          <input style={{ ...inputStyle, width:240 }} placeholder="Search by name, role or team..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>

        <Table heads={['Name','Role','Team','Hourly Rate','Actions']}>
          {filtered.map(p => (
            <tr key={p.id} style={{ background: deleteConfirm===p.id ? '#fff5f5' : 'transparent' }}>
              <Td>
                <div style={{ fontWeight:500 }}>{p.name}</div>
                <div style={{ fontSize:11, color:'#9ca3af', marginTop:2, fontFamily:'DM Mono,monospace' }}>{p.id.slice(0,8)}...</div>
              </Td>
              <Td>
                {editing === p.id ? (
                  <select style={{ ...inputStyle, width:140 }} value={editRole} onChange={e=>setEditRole(e.target.value)}>
                    {ALL_ROLES.map(r=><option key={r}>{r}</option>)}
                  </select>
                ) : (
                  <Badge text={p.role} type={ROLE_COLORS[p.role]||'gray'} />
                )}
              </Td>
              <Td>
                {editing === p.id ? (
                  <select style={{ ...inputStyle, width:180 }} value={editTeam} onChange={e=>setEditTeam(e.target.value)}>
                    {TEAMS.map(t=><option key={t}>{t}</option>)}
                  </select>
                ) : (
                  <span style={{ fontSize:13, color:'#6b7280' }}>{p.team||'?'}</span>
                )}
              </Td>
              <Td>
                {editing === p.id ? (
                  <input style={{ ...inputStyle, width:100 }} type="number" value={editRate} onChange={e=>setEditRate(e.target.value)} placeholder="e.g. 450" />
                ) : (
                  <span style={{ fontFamily:'DM Mono,monospace', fontSize:12 }}>
                    {p.hourly_rate > 0 ? 'R '+p.hourly_rate+'/h' : <span style={{ color:'#9ca3af' }}>Not set</span>}
                  </span>
                )}
              </Td>
              <Td>
                {deleteConfirm === p.id ? (
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'#dc2626', fontWeight:500 }}>Remove this user?</span>
                    <Btn small danger onClick={()=>deleteUser(p.id)} disabled={deleting}>
                      {deleting ? 'Removing...' : 'Yes, remove'}
                    </Btn>
                    <Btn small onClick={()=>setDeleteConfirm(null)}>Cancel</Btn>
                  </div>
                ) : editing === p.id ? (
                  <div style={{ display:'flex', gap:6 }}>
                    <Btn small primary onClick={()=>saveUser(p.id)}>Save</Btn>
                    <Btn small onClick={()=>setEditing(null)}>Cancel</Btn>
                  </div>
                ) : (
                  <div style={{ display:'flex', gap:6 }}>
                    <Btn small onClick={()=>startEdit(p)}>Edit</Btn>
                    <Btn small danger onClick={()=>setDeleteConfirm(p.id)}>Remove</Btn>
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </Table>

        {filtered.length === 0 && (
          <div style={{ textAlign:'center', color:'#9ca3af', padding:32, fontSize:13 }}>
            {search ? 'No users match your search.' : 'No users yet.'}
          </div>
        )}
      </Card>

      <div style={{ marginTop:12, fontSize:12, color:'#9ca3af' }}>
        Note: Removing a user deletes their profile from the system. Their time logs and activity history are preserved.
      </div>
    </div>
  )
}
