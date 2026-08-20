'use client'

import {
  useState,
  useEffect,
  useCallback
} from 'react'

import { createClient } from '@/lib/supabase/client'
import { Profile, TimeLog } from '@/lib/types'

import {
  Card,
  CardTitle,
  PageHeader,
  FormGroup,
  inputStyle,
  Table,
  Td,
  Badge
} from '@/components/ui'

import { fmtDate } from '@/lib/kpi'

const COLORS = [
  '#5b5ce2',
  '#0ea5e9',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#dc2626',
  '#f472b6',
  '#34d399',
  '#fb923c'
]

type RangeMode =
  | 'today'
  | 'week'
  | 'month'
  | 'custom'

type ScopeMode =
  | 'department'
  | 'person'
  | 'mine'

function localDateString(date: Date) {
  const year = date.getFullYear()
  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0')
  const day =
    String(
      date.getDate()
    ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function todayString() {
  return localDateString(new Date())
}

function startOfWeekString() {
  const d = new Date()
  const day =
    (d.getDay() + 6) % 7

  d.setDate(
    d.getDate() - day
  )

  return localDateString(d)
}

function startOfMonthString() {
  const d = new Date()

  return localDateString(
    new Date(
      d.getFullYear(),
      d.getMonth(),
      1
    )
  )
}

function formatDuration(total: number) {
  const minutes =
    Math.round(
      Number(total || 0) * 60
    )

  const hrs =
    Math.floor(minutes / 60)

  const mins =
    minutes % 60

  if (hrs === 0) {
    return `${mins}m`
  }

  if (mins === 0) {
    return `${hrs}h`
  }

  return `${hrs}h ${String(mins).padStart(2,'0')}m`
}

function displayCategory(log: TimeLog) {
  if (
    log.category === 'Other' &&
    log.custom_category?.trim()
  ) {
    return log.custom_category.trim()
  }

  return log.category
}

function getCategoryMap(logs: TimeLog[]) {
  const map:
    Record<string, number> = {}

  logs.forEach(log => {
    const category =
      displayCategory(log)

    map[category] =
      (map[category] || 0) +
      Number(log.hours)
  })

  return Object.entries(map)
    .sort((a,b) => b[1] - a[1])
}

function getProjectMap(logs: TimeLog[]) {
  const map:
    Record<string, number> = {}

  logs.forEach(log => {
    map[log.project] =
      (map[log.project] || 0) +
      Number(log.hours)
  })

  return Object.entries(map)
    .sort((a,b) => b[1] - a[1])
}

function getDailyMap(logs: TimeLog[]) {
  const map:
    Record<string, number> = {}

  logs.forEach(log => {
    map[log.date] =
      (map[log.date] || 0) +
      Number(log.hours)
  })

  return Object.entries(map)
    .sort((a,b) =>
      a[0].localeCompare(b[0])
    )
}

function getPersonMap(
  logs: TimeLog[],
  profiles: Profile[]
) {
  const map:
    Record<string, number> = {}

  logs.forEach(log => {
    const person =
      profiles.find(
        p => p.id === log.user_id
      )

    const name =
      person?.name ||
      (log.profiles as any)?.name ||
      'Unknown'

    map[name] =
      (map[name] || 0) +
      Number(log.hours)
  })

  return Object.entries(map)
    .sort((a,b) => b[1] - a[1])
}

function groupDailyActivity(
  logs: TimeLog[],
  profiles: Profile[]
) {
  const dateMap:
    Record<
      string,
      Record<string, TimeLog[]>
    > = {}

  logs.forEach(log => {
    if (!dateMap[log.date]) {
      dateMap[log.date] = {}
    }

    const person =
      profiles.find(
        p => p.id === log.user_id
      )

    const name =
      person?.name ||
      (log.profiles as any)?.name ||
      'Unknown'

    if (!dateMap[log.date][name]) {
      dateMap[log.date][name] = []
    }

    dateMap[log.date][name]
      .push(log)
  })

  return Object.entries(dateMap)
    .sort((a,b) =>
      b[0].localeCompare(a[0])
    )
    .map(([date, people]) => ({
      date,
      people:
        Object.entries(people)
          .map(
            ([name, items]) => ({
              name,
              items,
              total:
                items.reduce(
                  (sum, item) =>
                    sum +
                    Number(item.hours),
                  0
                )
            })
          )
          .sort(
            (a,b) =>
              b.total - a.total
          ),
      total:
        Object.values(people)
          .flat()
          .reduce(
            (sum, item) =>
              sum +
              Number(item.hours),
            0
          )
    }))
}

function BarList(props: {
  data: [string, number][]
  total: number
}) {
  if (!props.data.length) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: 'center',
          color: '#98a2b3',
          fontSize: 13,
        }}
      >
        No data for this period.
      </div>
    )
  }

  return (
    <div>
      {props.data
        .slice(0, 12)
        .map(
          ([label, value], index) => {
            const pct =
              props.total > 0
                ? Math.round(
                    value /
                    props.total *
                    100
                  )
                : 0

            return (
              <div
                key={label}
                style={{
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: 12,
                    marginBottom: 5,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    {label}
                  </span>

                  <span
                    style={{
                      fontSize: 12,
                      fontFamily:
                        'DM Mono,monospace',
                      fontWeight: 700,
                      color:
                        COLORS[
                          index %
                          COLORS.length
                        ],
                    }}
                  >
                    {formatDuration(value)}
                    {' | '}
                    {pct}%
                  </span>
                </div>

                <div
                  style={{
                    height: 7,
                    background: '#eef2f7',
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      borderRadius: 999,
                      background:
                        COLORS[
                          index %
                          COLORS.length
                        ],
                    }}
                  />
                </div>
              </div>
            )
          }
        )}
    </div>
  )
}

function DailyBars(props: {
  data: [string, number][]
}) {
  const max =
    Math.max(
      ...props.data.map(x => x[1]),
      1
    )

  if (!props.data.length) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: 'center',
          color: '#98a2b3',
        }}
      >
        No daily data.
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        minHeight: 190,
        overflowX: 'auto',
        padding: '14px 4px 0',
      }}
    >
      {props.data.map(
        ([date, value]) => {
          const height =
            Math.max(
              6,
              Math.round(
                value / max * 125
              )
            )

          return (
            <div
              key={date}
              style={{
                minWidth: 52,
                flex: 1,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#5f6b85',
                  marginBottom: 5,
                }}
              >
                {formatDuration(value)}
              </div>

              <div
                style={{
                  height,
                  maxWidth: 36,
                  margin: '0 auto',
                  borderRadius:
                    '7px 7px 3px 3px',
                  background:
                    'linear-gradient(180deg,#5b5ce2,#7c7ff0)',
                }}
              />

              <div
                style={{
                  fontSize: 9,
                  color: '#98a2b3',
                  marginTop: 7,
                }}
              >
                {date.slice(5)}
              </div>
            </div>
          )
        }
      )}
    </div>
  )
}

export default function TrendsPage() {
  const supabase = createClient()

  const [me, setMe] =
    useState<Profile | null>(null)

  const [profiles, setProfiles] =
    useState<Profile[]>([])

  const [logs, setLogs] =
    useState<TimeLog[]>([])

  const [scope, setScope] =
    useState<ScopeMode>('mine')

  const [selectedUser, setSelectedUser] =
    useState('')

  const [range, setRange] =
    useState<RangeMode>('today')

  const [customFrom, setCustomFrom] =
    useState(todayString())

  const [customTo, setCustomTo] =
    useState(todayString())

  const [loading, setLoading] =
    useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: profile } =
      await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    setMe(profile)

    const elevated =
      profile &&
      (
        profile.role === 'Manager' ||
        profile.role === 'Admin' ||
        profile.role === 'Executive'
      )

    if (elevated) {
      const [
        profileResult,
        logResult
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .order('name'),

        supabase
          .from('time_logs')
          .select(
            '*, profiles(name,role,team)'
          )
          .order(
            'date',
            { ascending: false }
          )
          .limit(5000)
      ])

      setProfiles(
        profileResult.data || []
      )

      setLogs(
        logResult.data || []
      )

      setScope('department')
    } else {
      const { data: ownLogs } =
        await supabase
          .from('time_logs')
          .select(
            '*, profiles(name,role,team)'
          )
          .eq('user_id', user.id)
          .order(
            'date',
            { ascending: false }
          )
          .limit(2000)

      setProfiles(
        profile
          ? [profile]
          : []
      )

      setLogs(
        ownLogs || []
      )

      setScope('mine')
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const elevated =
    me &&
    (
      me.role === 'Manager' ||
      me.role === 'Admin' ||
      me.role === 'Executive'
    )

  const prProfiles = profiles

  let scopedLogs =
    logs

  if (!elevated || scope === 'mine') {
    scopedLogs =
      logs.filter(
        log =>
          log.user_id === me?.id
      )
  }

  if (
    elevated &&
    scope === 'department'
  ) {
    scopedLogs = logs
  }

  if (
    elevated &&
    scope === 'person'
  ) {
    scopedLogs =
      selectedUser
        ? logs.filter(
            log =>
              log.user_id ===
              selectedUser
          )
        : []
  }

  const today =
    todayString()

  let from = today
  let to = today

  if (range === 'week') {
    from =
      startOfWeekString()
  }

  if (range === 'month') {
    from =
      startOfMonthString()
  }

  if (range === 'custom') {
    from = customFrom
    to = customTo
  }

  const filtered =
    scopedLogs.filter(log => {
      return (
        log.date >= from &&
        log.date <= to
      )
    })

  const totalHours =
    filtered.reduce(
      (sum, log) =>
        sum +
        Number(log.hours),
      0
    )

  const activeDays =
    new Set(
      filtered.map(
        log => log.date
      )
    ).size

  const activePeople =
    new Set(
      filtered.map(
        log => log.user_id
      )
    ).size

  const categories =
    getCategoryMap(filtered)

  const projects =
    getProjectMap(filtered)

  const daily =
    getDailyMap(filtered)

  const people =
    getPersonMap(
      filtered,
      profiles
    )

  const activity =
    groupDailyActivity(
      filtered,
      profiles
    )

  const selectedPerson =
    profiles.find(
      p =>
        p.id === selectedUser
    )

  const scopeTitle =
    !elevated ||
    scope === 'mine'
      ? 'My Activity'
      : scope === 'department'
        ? 'PR Department'
        : selectedPerson?.name ||
          'Select a person'

  if (loading) {
    return (
      <div
        style={{
          padding: 48,
          textAlign: 'center',
          color: '#98a2b3',
        }}
      >
        Loading trends...
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Trends"
        subtitle="See what the PR Department worked on today and how time is being used."
      />

      <Card
        style={{
          marginBottom: 18,
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 18,
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          {elevated && (
            <FormGroup label="View">
              <div
                style={{
                  display: 'flex',
                  gap: 7,
                  flexWrap: 'wrap',
                }}
              >
                {[
                  {
                    key: 'department',
                    label:
                      'PR Department'
                  },
                  {
                    key: 'person',
                    label:
                      'By Person'
                  },
                  {
                    key: 'mine',
                    label:
                      'My Logs'
                  }
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() =>
                      setScope(
                        item.key as ScopeMode
                      )
                    }
                    style={{
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 13px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 700,
                      fontSize: 12,
                      background:
                        scope === item.key
                          ? '#5b5ce2'
                          : '#f3f6fb',
                      color:
                        scope === item.key
                          ? '#fff'
                          : '#5f6b85',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </FormGroup>
          )}

          {elevated &&
          scope === 'person' && (
            <FormGroup label="Person">
              <select
                style={{
                  ...inputStyle,
                  width: 220,
                }}
                value={selectedUser}
                onChange={e =>
                  setSelectedUser(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select person
                </option>

                {prProfiles.map(
                  profile => (
                    <option
                      key={profile.id}
                      value={profile.id}
                    >
                      {profile.name}
                    </option>
                  )
                )}
              </select>
            </FormGroup>
          )}
        </div>
      </Card>

      <Card
        style={{
          marginBottom: 20,
          padding: '16px 20px',
        }}
      >
        <FormGroup label="Period">
          <div
            style={{
              display: 'flex',
              gap: 7,
              flexWrap: 'wrap',
            }}
          >
            {[
              {
                key: 'today',
                label: 'Today'
              },
              {
                key: 'week',
                label: 'This Week'
              },
              {
                key: 'month',
                label: 'This Month'
              },
              {
                key: 'custom',
                label: 'Custom'
              }
            ].map(item => (
              <button
                key={item.key}
                onClick={() =>
                  setRange(
                    item.key as RangeMode
                  )
                }
                style={{
                  border:
                    range === item.key
                      ? '1px solid #5b5ce2'
                      : '1px solid #e6ebf3',
                  borderRadius: 10,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  fontSize: 12,
                  background:
                    range === item.key
                      ? '#eef0ff'
                      : '#fff',
                  color:
                    range === item.key
                      ? '#5b5ce2'
                      : '#5f6b85',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </FormGroup>

        {range === 'custom' && (
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 14,
              flexWrap: 'wrap',
            }}
          >
            <FormGroup label="From">
              <input
                type="date"
                style={inputStyle}
                value={customFrom}
                onChange={e =>
                  setCustomFrom(
                    e.target.value
                  )
                }
              />
            </FormGroup>

            <FormGroup label="To">
              <input
                type="date"
                style={inputStyle}
                value={customTo}
                onChange={e =>
                  setCustomTo(
                    e.target.value
                  )
                }
              />
            </FormGroup>
          </div>
        )}
      </Card>

      <div
        style={{
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#141b2d',
          }}
        >
          {scopeTitle}
        </div>

        <div
          style={{
            fontSize: 12,
            color: '#6b7280',
            marginTop: 3,
          }}
        >
          {fmtDate(from)}
          {from !== to
            ? ` to ${fmtDate(to)}`
            : ''}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit,minmax(170px,1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        {[
          {
            label: 'Total Logged',
            value:
              formatDuration(
                totalHours
              ),
            color: '#5b5ce2'
          },
          {
            label: 'People',
            value:
              String(activePeople),
            color: '#059669'
          },
          {
            label: 'Entries',
            value:
              String(filtered.length),
            color: '#0ea5e9'
          },
          {
            label: 'Active Days',
            value:
              String(activeDays),
            color: '#d97706'
          }
        ].map(item => (
          <div
            key={item.label}
            style={{
              background: '#fff',
              border:
                '1px solid #e6ebf3',
              borderRadius: 16,
              padding: '17px 18px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background:
                  item.color,
              }}
            />

            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform:
                  'uppercase',
                letterSpacing:
                  '0.1em',
                color: '#98a2b3',
              }}
            >
              {item.label}
            </div>

            <div
              style={{
                fontSize: 25,
                fontWeight: 900,
                color: item.color,
                marginTop: 8,
                fontFamily:
                  'DM Mono,monospace',
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <Card
        style={{
          marginBottom: 20,
        }}
      >
        {filtered.length > 0 && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit,minmax(320px,1fr))',
              gap: 20,
              marginBottom: 20,
            }}
          >
            <Card>
              <CardTitle>
                Category Breakdown
              </CardTitle>

              <BarList
                data={categories}
                total={totalHours}
              />
            </Card>

            <Card>
              <CardTitle>
                Project Breakdown
              </CardTitle>

              <BarList
                data={projects}
                total={totalHours}
              />
            </Card>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit,minmax(320px,1fr))',
              gap: 20,
            }}
          >
            <Card>
              <CardTitle>
                Daily Hours
              </CardTitle>

              <DailyBars
                data={daily}
              />
            </Card>

            {elevated &&
             scope === 'department' && (
              <Card>
                <CardTitle>
                  Hours by Person
                </CardTitle>

                <BarList
                  data={people}
                  total={totalHours}
                />
              </Card>
            )}
          </div>
        </>
      )}

      <CardTitle>
          Daily Activity
        </CardTitle>

        {!activity.length && (
          <div
            style={{
              padding: 38,
              textAlign: 'center',
              color: '#98a2b3',
              fontSize: 13,
            }}
          >
            No time has been logged for
            this period.
          </div>
        )}

        {activity.map(day => (
          <div
            key={day.date}
            style={{
              border:
                '1px solid #edf1f7',
              borderRadius: 14,
              overflow: 'hidden',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                padding: '11px 14px',
                background: '#f7f9fd',
                display: 'flex',
                justifyContent:
                  'space-between',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: '#141b2d',
                }}
              >
                {fmtDate(day.date)}
              </div>

              <Badge
                text={formatDuration(
                  day.total
                )}
                type="blue"
              />
            </div>

            {day.people.map(person => (
              <div
                key={person.name}
                style={{
                  padding: '14px',
                  borderTop:
                    '1px solid #edf1f7',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    marginBottom: 10,
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: '#374151',
                    }}
                  >
                    {person.name}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#5b5ce2',
                    }}
                  >
                    {formatDuration(
                      person.total
                    )}
                  </div>
                </div>

                <Table
                  heads={[
                    'Project',
                    'Category',
                    'Notes',
                    'Time'
                  ]}
                  empty={
                    person.items.length ===
                    0
                  }
                >
                  {person.items.map(log => (
                    <tr key={log.id}>
                      <Td
                        style={{
                          fontWeight: 600,
                        }}
                      >
                        {log.project}
                      </Td>

                      <Td>
                        <Badge
                          text={
                            displayCategory(
                              log
                            )
                          }
                        />
                      </Td>

                      <Td
                        style={{
                          maxWidth: 320,
                          color: '#5f6b85',
                        }}
                      >
                        {log.notes || '-'}
                      </Td>

                      <Td
                        style={{
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDuration(
                          log.hours
                        )}
                      </Td>
                    </tr>
                  ))}
                </Table>
              </div>
            ))}
          </div>
        ))}
      </Card>
    </div>
  )
}


