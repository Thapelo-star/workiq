import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computeKpis, fmtDate } from '@/lib/kpi'
import {
  KpiCard,
  Card,
  CardTitle,
  PageHeader,
  Badge,
  Table,
  Td,
  Btn
} from '@/components/ui'
import { TimeLog, Profile } from '@/lib/types'

function formatDuration(total: number) {
  const minutes = Math.round(Number(total || 0) * 60)
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`

  return `${hrs}h ${String(mins).padStart(2,'0')}m`
}

export default async function OverviewPage() {
  const supabase = createClient()

  const { data: { user } } =
    await supabase.auth.getUser()

  const { data: profile } =
    await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single() as { data: Profile }

  let logsQuery = supabase
    .from('time_logs')
    .select('*, profiles(name,role,team)')
    .order('date', { ascending:false })
    .limit(200)

  if (profile.role === 'Employee') {
    logsQuery = logsQuery.eq('user_id', user!.id)
  }

  const { data: logsRaw } = await logsQuery

  const logs: TimeLog[] = logsRaw || []
  const kpis = computeKpis(logs)

  const recentLogs = logs.slice(0, 8)

  const uniqueProjects =
    new Set(
      logs
        .map(l => l.project)
        .filter(Boolean)
    ).size

  const uniqueCategories =
    new Set(
      logs.map(l =>
        l.category === 'Other' && l.custom_category
          ? l.custom_category
          : l.category
      )
    ).size

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="PR Department time capture and workload visibility."
        action={
          <Link href="/dashboard/time">
            <Btn primary>Log Time</Btn>
          </Link>
        }
      />

      <div
        style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',
          gap:16,
          marginBottom:24
        }}
      >
        <KpiCard
          label="Total Hours"
          value={kpis.totalHours}
          sub={`${kpis.activeDays} active days`}
          color="#6366f1"
        />

        <KpiCard
          label="Avg Hours / Day"
          value={kpis.avgPerDay}
          sub="Based on current data"
          color="#0ea5e9"
        />

        <KpiCard
          label="Top Project"
          value={kpis.topProject?.[0] || '-'}
          sub={
            kpis.topProject
              ? `${kpis.topProject[1].toFixed(1)}h logged`
              : 'No project data yet'
          }
          color="#10b981"
        />

        <KpiCard
          label="Top Category"
          value={kpis.topCategory?.[0] || '-'}
          sub={`${uniqueCategories} categories in use`}
          color="#f59e0b"
        />

        <KpiCard
          label="Projects Tracked"
          value={uniqueProjects}
          sub="Across current view"
          color="#8b5cf6"
        />
      </div>

      <div
        style={{
          display:'grid',
          gridTemplateColumns:'1.5fr 0.8fr',
          gap:20
        }}
      >
        <Card>
          <CardTitle>Recent Time Logs</CardTitle>

          <Table
            heads={[
              'Date',
              'Person',
              'Project',
              'Category',
              'Time'
            ]}
            empty={recentLogs.length === 0}
          >
            {recentLogs.map(log => (
              <tr key={log.id}>
                <Td>{fmtDate(log.date)}</Td>

                <Td>
                  {(log.profiles as any)?.name || '-'}
                </Td>

                <Td>{log.project}</Td>

                <Td>
                  <Badge
                    text={
                      log.category === 'Other' &&
                      log.custom_category
                        ? log.custom_category
                        : log.category
                    }
                  />
                </Td>

                <Td style={{ fontWeight:700 }}>
                  {formatDuration(log.hours)}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <CardTitle>PR Workspace</CardTitle>

          <div
            style={{
              display:'flex',
              flexDirection:'column',
              gap:14
            }}
          >
            <div
              style={{
                padding:'14px',
                background:'#eef2ff',
                borderRadius:12
              }}
            >
              <div
                style={{
                  fontSize:12,
                  fontWeight:800,
                  color:'#4f46e5',
                  marginBottom:5
                }}
              >
                Time Capture
              </div>

              <div
                style={{
                  fontSize:13,
                  color:'#4b5563',
                  lineHeight:1.5
                }}
              >
                Record PR work by date, duration, project and category.
              </div>
            </div>

            <div
              style={{
                padding:'14px',
                background:'#ecfeff',
                borderRadius:12
              }}
            >
              <div
                style={{
                  fontSize:12,
                  fontWeight:800,
                  color:'#0891b2',
                  marginBottom:5
                }}
              >
                Trends
              </div>

              <div
                style={{
                  fontSize:13,
                  color:'#4b5563',
                  lineHeight:1.5
                }}
              >
                Review where the department's time is going and what work is being completed.
              </div>
            </div>

            <div
              style={{
                display:'flex',
                gap:8,
                marginTop:4,
                flexWrap:'wrap'
              }}
            >
              <Link href="/dashboard/time">
                <Btn primary>Time Capture</Btn>
              </Link>

              <Link href="/dashboard/trends">
                <Btn>View Trends</Btn>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
