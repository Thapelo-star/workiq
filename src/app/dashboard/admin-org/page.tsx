'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle, PageHeader, Btn, FormGroup, inputStyle } from '@/components/ui'

export default function AdminOrgPage() {
  const supabase = createClient()
  const [orgId, setOrgId] = useState('')
  const [orgName, setOrgName] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('org_settings').select('*').limit(1).single().then(({ data }) => {
      if (data) { setOrgId(data.id); setOrgName(data.org_name) }
    })
  }, [])

  async function save() {
    if (!orgName.trim()) return
    setSaving(true)
    const { error } = orgId
      ? await supabase.from('org_settings').update({ org_name: orgName, updated_at: new Date().toISOString() }).eq('id', orgId)
      : await supabase.from('org_settings').insert({ org_name: orgName })
    setSaving(false)
    setMsg(error ? error.message : 'Saved. Refresh the page to see the new name in the top bar.')
    setTimeout(() => setMsg(''), 4000)
  }

  return (
    <div>
      <PageHeader title="Organisation Settings" subtitle="Configure your workspace name and branding." />
      <Card style={{ maxWidth:480 }}>
        <CardTitle>Organisation Name</CardTitle>
        <div style={{ marginBottom:16 }}>
          <FormGroup label="Display Name">
            <input style={inputStyle} value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Acme Corp" />
          </FormGroup>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <Btn primary onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Btn>
          {msg && <span style={{ fontSize:13, color: msg.includes('error') ? '#c0392b' : '#1a7f5a' }}>{msg}</span>}
        </div>
      </Card>
    </div>
  )
}
