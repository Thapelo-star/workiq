'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardTitle,
  PageHeader,
  Btn,
  Badge,
  FormGroup,
  inputStyle
} from '@/components/ui'
import { Profile } from '@/lib/types'

type ListItem = {
  id: string
  name: string
  active: boolean
  sort_order: number
}

function sortCategories(items: ListItem[]) {
  return [...items].sort((a, b) => {
    if (a.name === 'Other') return 1
    if (b.name === 'Other') return -1
    return a.name.localeCompare(b.name)
  })
}

export default function ManageCategoriesPage() {
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [categories, setCategories] = useState<ListItem[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(prof)

    const { data } = await supabase
      .from('time_categories')
      .select('*')
      .order('name')

    setCategories(sortCategories(data || []))
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const allowed =
    profile?.role === 'Manager' ||
    profile?.role === 'Admin'

  async function addCategory() {
    const name = newCategory.trim()

    if (!name) return

    const { error } = await supabase
      .from('time_categories')
      .insert({
        name,
        active: true,
        sort_order: 0,
      })

    if (error) {
      setMessage(error.message)
      return
    }

    setNewCategory('')
    setMessage('Category added successfully.')
    load()
  }

  async function renameCategory(item: ListItem) {
    if (item.name === 'Other') return

    const next = window.prompt('Rename category', item.name)

    if (!next || !next.trim()) return

    const newName = next.trim()

    const { error } = await supabase
      .from('time_categories')
      .update({ name: newName })
      .eq('id', item.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase
      .from('time_logs')
      .update({ category: newName })
      .eq('category', item.name)

    setMessage('Category renamed successfully.')
    load()
  }

  async function toggleCategory(item: ListItem) {
    if (item.name === 'Other') return

    const { error } = await supabase
      .from('time_categories')
      .update({ active: !item.active })
      .eq('id', item.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(
      item.active
        ? 'Category deactivated.'
        : 'Category activated.'
    )

    load()
  }

  if (!profile) {
    return (
      <div style={{ padding: 40 }}>
        Loading...
      </div>
    )
  }

  if (!allowed) {
    return (
      <div>
        <PageHeader
          title="Manage Categories"
          subtitle="Manager or Admin access is required."
        />

        <Card>
          <div
            style={{
              padding: 30,
              color: '#6b7280',
              textAlign: 'center'
            }}
          >
            You do not have permission to manage categories.
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Manage Categories"
        subtitle="Manage the categories available to the PR Department."
      />

      {message && (
        <div
          style={{
            marginBottom: 18,
            padding: '11px 14px',
            borderRadius: 12,
            background: '#eef2ff',
            color: '#4f46e5',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      )}

      <Card>
        <CardTitle>PR Categories</CardTitle>

        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
            marginBottom: 22,
            maxWidth: 600,
          }}
        >
          <div style={{ flex: 1 }}>
            <FormGroup label="Add Category">
              <input
                style={inputStyle}
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="Enter a new PR category"
                onKeyDown={e => {
                  if (e.key === 'Enter') addCategory()
                }}
              />
            </FormGroup>
          </div>

          <Btn primary onClick={addCategory}>
            Add Category
          </Btn>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {categories.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                border: '1px solid #edf1f7',
                borderRadius: 12,
                background: '#fff',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#141b2d',
                  }}
                >
                  {item.name}
                </div>

                <div style={{ marginTop: 5 }}>
                  <Badge
                    text={item.active ? 'Active' : 'Inactive'}
                    type={item.active ? 'green' : 'gray'}
                  />
                </div>
              </div>

              {item.name === 'Other' ? (
                <span
                  style={{
                    fontSize: 11,
                    color: '#98a2b3',
                    fontWeight: 700,
                  }}
                >
                  Always available
                </span>
              ) : (
                <>
                  <Btn
                    small
                    onClick={() => renameCategory(item)}
                  >
                    Rename
                  </Btn>

                  <Btn
                    small
                    onClick={() => toggleCategory(item)}
                  >
                    {item.active ? 'Deactivate' : 'Activate'}
                  </Btn>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
