'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, ALL_ROLES } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, Table, Td, Badge, FormGroup, inputStyle } from '@/components/ui'

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

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('name')
    setProfiles(data || [])
  }, [])

  useEffect(() => { load() }, [])

  async function saveUser(id: string) {
    const { error } = await supabase.from('profiles').update({
      hourly_rate: parseFloat(editRate) || 0,
      role: editRole,
      team: editTeam,
    }).eq('id', id)
    if (error) { setMsg('Error: ' + error.message); return }
    await load()
    setEditing(null)
    setMsg('User updated successfully.')
    setTimeout(() => setMsg(''), 3000)
  }

  function startEdit(p: Profile) {
    setEditing(p.id)
    setEditRate(String(p.hourly_rate || ''))
    setEditRole(p.role)
    setEditTeam(p.team)
  }

  const filtered = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.role.toLowerCase().includes(search.toLowerCase()) ||
    p.team.toLowerCase().includes(search.toLowerCase())
  )

  const roleCounts = ALL_ROLES.map(r => ({ role: r, count: profiles.filter(p => p.role === r).length }))

  return (
    <div>
      <PageHeader title="Users & Roles" subtitle="Manage workspace members, roles, teams, and hourly cost rates." />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
        {roleCounts.map(({ role, count }) => (
          <div key={role} style={{ background:'#fff', border:'1px solid #e2e0d8', borderRadius:8, padding:'14px 16px' }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', color:'#9e9b94', marginBottom:6 }}>{role}</div>
            <div style={{ fontSize:24, fontWeight:600 }}>{count}</div>
          </div>
        ))}
      </div>

      {msg && (
        <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:6, fontSize:13, background: msg.startsWith('Error') ? '#fdecea':'#e6f4ee', color: msg.startsWith('Error') ? '#c0392b':'#1a7f5a' }}>
          {msg}
        </div>
      )}

      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <CardTitle>All Users ({filtered.length})</CardTitle>
          <input style={{ ...inputStyle, width:220 }} placeholder="Search by name, role or team..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Table heads={['Name','Role','Team','Hourly Rate','Actions']}>
          {filtered.map(p => (
            <tr key={p.id}>
              <Td>
                <div style={{ fontWeight:500 }}>{p.name}</div>
                <div style={{ fontSize:11, color:'#9e9b94', marginTop:2, fontFamily:'DM Mono,monospace' }}>{p.id.slice(0,8)}...</div>
              </Td>
              <Td>
                {editing === p.id ? (
                  <select style={{ ...inputStyle, width:140 }} value={editRole} onChange={e => setEditRole(e.target.value)}>
                    {ALL_ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                ) : (
                  <Badge text={p.role} type={ROLE_COLORS[p.role] || 'gray'} />
                )}
              </Td>
              <Td>
                {editing === p.id ? (
                  <input style={{ ...inputStyle, width:120 }} value={editTeam} onChange={e => setEditTeam(e.target.value)} placeholder="Team name" />
                ) : (
                  <span style={{ color:'#6b6860' }}>{p.team}</span>
                )}
              </Td>
              <Td>
                {editing === p.id ? (
                  <input style={{ ...inputStyle, width:100 }} type="number" value={editRate} onChange={e => setEditRate(e.target.value)} placeholder="e.g. 450" />
                ) : (
                  <span style={{ fontFamily:'DM Mono,monospace', fontSize:12 }}>
                    {p.hourly_rate > 0 ? 'R ' + p.hourly_rate + '/h' : <span style={{ color:'#9e9b94' }}>Not set</span>}
                  </span>
                )}
              </Td>
              <Td>
                {editing === p.id ? (
                  <div style={{ display:'flex', gap:6 }}>
                    <Btn small primary onClick={() => saveUser(p.id)}>Save</Btn>
                    <Btn small onClick={() => setEditing(null)}>Cancel</Btn>
                  </div>
                ) : (
                  <Btn small onClick={() => startEdit(p)}>Edit</Btn>
                )}
              </Td>
            </tr>
          ))}
        </Table>

        {filtered.length === 0 && (
          <div style={{ textAlign:'center', color:'#9e9b94', padding:32, fontSize:13 }}>
            {search ? 'No users match your search.' : 'No users yet.'}
          </div>
        )}
      </Card>
    </div>
  )
}
