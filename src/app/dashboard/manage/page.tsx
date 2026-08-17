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

export default function ManageListsPage() {
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)

  const [categories, setCategories] = useState<ListItem[]>([])
  const [projects, setProjects] = useState<ListItem[]>([])

  const [newCategory, setNewCategory] = useState('')
  const [newProject, setNewProject] = useState('')

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

    const [categoryResult, projectResult] =
      await Promise.all([
        supabase
          .from('time_categories')
          .select('*')
          .order('sort_order')
          .order('name'),

        supabase
          .from('time_projects')
          .select('*')
          .order('sort_order')
          .order('name'),
      ])

    setCategories(categoryResult.data || [])
    setProjects(projectResult.data || [])
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

    const maxOrder =
      categories.length
        ? Math.max(...categories.map(x => x.sort_order))
        : 0

    const { error } = await supabase
      .from('time_categories')
      .insert({
        name,
        active: true,
        sort_order: maxOrder + 10,
      })

    if (error) {
      setMessage(error.message)
      return
    }

    setNewCategory('')
    setMessage('Category added.')
    load()
  }

  async function addProject() {
    const name = newProject.trim()

    if (!name) return

    const maxOrder =
      projects.length
        ? Math.max(...projects.map(x => x.sort_order))
        : 0

    const { error } = await supabase
      .from('time_projects')
      .insert({
        name,
        active: true,
        sort_order: maxOrder + 10,
      })

    if (error) {
      setMessage(error.message)
      return
    }

    setNewProject('')
    setMessage('Project added.')
    load()
  }

  async function renameCategory(item: ListItem) {
    if (item.name === 'Other') return

    const next = window.prompt(
      'Rename category',
      item.name
    )

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

    setMessage('Category renamed.')
    load()
  }

  async function renameProject(item: ListItem) {
    const next = window.prompt(
      'Rename project',
      item.name
    )

    if (!next || !next.trim()) return

    const newName = next.trim()

    const { error } = await supabase
      .from('time_projects')
      .update({ name: newName })
      .eq('id', item.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase
      .from('time_logs')
      .update({ project: newName })
      .eq('project', item.name)

    setMessage('Project renamed.')
    load()
  }

  async function toggleCategory(item: ListItem) {
    if (item.name === 'Other') return

    await supabase
      .from('time_categories')
      .update({ active: !item.active })
      .eq('id', item.id)

    load()
  }

  async function toggleProject(item: ListItem) {
    await supabase
      .from('time_projects')
      .update({ active: !item.active })
      .eq('id', item.id)

    load()
  }

  async function moveItem(
    table: 'time_categories' | 'time_projects',
    items: ListItem[],
    index: number,
    direction: -1 | 1
  ) {
    const targetIndex = index + direction

    if (
      targetIndex < 0 ||
      targetIndex >= items.length
    ) {
      return
    }

    const current = items[index]
    const target = items[targetIndex]

    await supabase
      .from(table)
      .update({ sort_order: target.sort_order })
      .eq('id', current.id)

    await supabase
      .from(table)
      .update({ sort_order: current.sort_order })
      .eq('id', target.id)

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
          title="Manage Lists"
          subtitle="Manager access is required."
        />

        <Card>
          <div
            style={{
              padding: 30,
              color: '#6b7280',
              textAlign: 'center',
            }}
          >
            You do not have permission to manage
            categories or projects.
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Manage Lists"
        subtitle="Manage the categories and projects used by the PR Department."
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit,minmax(360px,1fr))',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <Card>
          <CardTitle>Categories</CardTitle>

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 18,
            }}
          >
            <div style={{ flex: 1 }}>
              <FormGroup label="Add Category">
                <input
                  style={inputStyle}
                  value={newCategory}
                  onChange={e =>
                    setNewCategory(e.target.value)
                  }
                  placeholder="New PR category"
                />
              </FormGroup>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
              }}
            >
              <Btn primary onClick={addCategory}>
                Add
              </Btn>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {categories.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
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

                  <div style={{ marginTop: 4 }}>
                    <Badge
                      text={
                        item.active
                          ? 'Active'
                          : 'Inactive'
                      }
                      type={
                        item.active
                          ? 'green'
                          : 'gray'
                      }
                    />
                  </div>
                </div>

                <Btn
                  small
                  onClick={() =>
                    moveItem(
                      'time_categories',
                      categories,
                      index,
                      -1
                    )
                  }
                >
                  Up
                </Btn>

                <Btn
                  small
                  onClick={() =>
                    moveItem(
                      'time_categories',
                      categories,
                      index,
                      1
                    )
                  }
                >
                  Down
                </Btn>

                {item.name !== 'Other' && (
                  <>
                    <Btn
                      small
                      onClick={() =>
                        renameCategory(item)
                      }
                    >
                      Rename
                    </Btn>

                    <Btn
                      small
                      onClick={() =>
                        toggleCategory(item)
                      }
                    >
                      {item.active
                        ? 'Deactivate'
                        : 'Activate'}
                    </Btn>
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Projects</CardTitle>

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 18,
            }}
          >
            <div style={{ flex: 1 }}>
              <FormGroup label="Add Project">
                <input
                  style={inputStyle}
                  value={newProject}
                  onChange={e =>
                    setNewProject(e.target.value)
                  }
                  placeholder="New PR project"
                />
              </FormGroup>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
              }}
            >
              <Btn primary onClick={addProject}>
                Add
              </Btn>
            </div>
          </div>

          {projects.length === 0 && (
            <div
              style={{
                padding: 20,
                color: '#98a2b3',
                textAlign: 'center',
                fontSize: 13,
              }}
            >
              No managed projects yet.
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {projects.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
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

                  <div style={{ marginTop: 4 }}>
                    <Badge
                      text={
                        item.active
                          ? 'Active'
                          : 'Inactive'
                      }
                      type={
                        item.active
                          ? 'green'
                          : 'gray'
                      }
                    />
                  </div>
                </div>

                <Btn
                  small
                  onClick={() =>
                    moveItem(
                      'time_projects',
                      projects,
                      index,
                      -1
                    )
                  }
                >
                  Up
                </Btn>

                <Btn
                  small
                  onClick={() =>
                    moveItem(
                      'time_projects',
                      projects,
                      index,
                      1
                    )
                  }
                >
                  Down
                </Btn>

                <Btn
                  small
                  onClick={() =>
                    renameProject(item)
                  }
                >
                  Rename
                </Btn>

                <Btn
                  small
                  onClick={() =>
                    toggleProject(item)
                  }
                >
                  {item.active
                    ? 'Deactivate'
                    : 'Activate'}
                </Btn>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
