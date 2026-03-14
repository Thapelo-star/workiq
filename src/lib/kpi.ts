import { TimeLog, KpiData, BILLABLE_CATEGORIES, KpiRules, Insight } from './types'

export function computeKpis(logs: TimeLog[]): KpiData {
  const total = logs.reduce((s, l) => s + Number(l.hours), 0)
  const days = new Set(logs.map(l => l.date)).size || 1
  const avg = parseFloat((total / days).toFixed(1))
  const catMap: Record<string, number> = {}
  const projMap: Record<string, number> = {}
  logs.forEach(l => {
    catMap[l.category] = (catMap[l.category] || 0) + Number(l.hours)
    projMap[l.project] = (projMap[l.project] || 0) + Number(l.hours)
  })
  const billable = logs
    .filter(l => BILLABLE_CATEGORIES.includes(l.category as any))
    .reduce((s, l) => s + Number(l.hours), 0)
  const billablePct = total > 0 ? Math.round((billable / total) * 100) : 0
  const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1])
  const sortedProjs = Object.entries(projMap).sort((a, b) => b[1] - a[1])
  return {
    totalHours: parseFloat(total.toFixed(1)),
    activeDays: days,
    avgPerDay: avg,
    billableHours: parseFloat(billable.toFixed(1)),
    billablePct,
    topCategory: sortedCats[0] || null,
    topProject: sortedProjs[0] || null,
    catMap,
    projMap,
  }
}

export function computeFlags(kpis: KpiData, rules: KpiRules) {
  const flags: { level: 'High' | 'Med' | 'Low'; msg: string }[] = []
  if (kpis.avgPerDay > rules.daily_hours_threshold)
    flags.push({ level: 'High', msg: 'Average daily hours (' + kpis.avgPerDay + 'h) exceeds the ' + rules.daily_hours_threshold + 'h threshold.' })
  if (kpis.billablePct < rules.billable_target)
    flags.push({ level: 'Med', msg: 'Billable % (' + kpis.billablePct + '%) is below the ' + rules.billable_target + '% target.' })
  const mtgPct = kpis.totalHours > 0 ? Math.round(((kpis.catMap['Meetings'] || 0) / kpis.totalHours) * 100) : 0
  if (mtgPct > 25)
    flags.push({ level: 'Med', msg: 'Meetings account for ' + mtgPct + '% of total hours.' })
  return flags
}

export function generateInsights(kpis: KpiData, rules: KpiRules, variant: number = 0): Insight[] {
  const targets = rules.category_targets as Record<string, number>
  return [
    {
      id: 'i1',
      severity: kpis.avgPerDay > rules.daily_hours_threshold ? 'High' : 'Low',
      title: kpis.avgPerDay > rules.daily_hours_threshold ? 'Overload Risk Detected' : 'Hours Within Normal Range',
      detail: 'Average daily hours are ' + kpis.avgPerDay + 'h against a ' + rules.daily_hours_threshold + 'h threshold. ' + (kpis.avgPerDay > rules.daily_hours_threshold ? 'Sustained overload increases burnout risk.' : 'Workload appears balanced.') + (variant > 0 ? ' Pattern persists across the selected date range.' : ''),
      related: 'avgHours',
    },
    {
      id: 'i2',
      severity: kpis.billablePct < rules.billable_target ? 'High' : 'Low',
      title: kpis.billablePct < rules.billable_target ? 'Billable Target Not Met' : 'Billable Target Achieved',
      detail: 'Billable hours represent ' + kpis.billablePct + '% of total time. Target is ' + rules.billable_target + '%.' + (variant > 0 ? ' Review non-billable breakdown.' : ''),
      related: 'billable',
    },
    {
      id: 'i3',
      severity: (kpis.catMap['Meetings'] || 0) / (kpis.totalHours || 1) > 0.25 ? 'High' : 'Low',
      title: 'Meeting Load Analysis',
      detail: 'Meetings consumed ' + (kpis.catMap['Meetings'] || 0).toFixed(1) + 'h (' + Math.round(((kpis.catMap['Meetings'] || 0) / (kpis.totalHours || 1)) * 100) + '% of total).',
      related: 'category:Meetings',
    },
    {
      id: 'i4',
      severity: (kpis.catMap['Development'] || 0) < (targets['Development'] || 20) ? 'Med' : 'Low',
      title: 'Development Hours vs Target',
      detail: 'Development hours: ' + (kpis.catMap['Development'] || 0).toFixed(1) + 'h. Target: ' + (targets['Development'] || 20) + 'h.',
      related: 'category:Development',
    },
    {
      id: 'i5',
      severity: kpis.topProject && kpis.totalHours > 0 && (kpis.topProject[1] / kpis.totalHours) > 0.6 ? 'Med' : 'Low',
      title: 'Project Concentration Risk',
      detail: (kpis.topProject ? kpis.topProject[0] : 'Top project') + ' accounts for ' + (kpis.topProject && kpis.totalHours > 0 ? Math.round((kpis.topProject[1] / kpis.totalHours) * 100) : 0) + '% of logged hours.',
      related: 'project',
    },
    {
      id: 'i6',
      severity: 'Low',
      title: 'Research Investment',
      detail: 'Research hours: ' + (kpis.catMap['Research'] || 0).toFixed(1) + 'h vs ' + (targets['Research'] || 4) + 'h target.',
      related: 'category:Research',
    },
    {
      id: 'i7',
      severity: (kpis.catMap['Admin'] || 0) > (targets['Admin'] || 3) * 1.5 ? 'Med' : 'Low',
      title: 'Administrative Overhead',
      detail: 'Admin tasks consumed ' + (kpis.catMap['Admin'] || 0).toFixed(1) + 'h. ' + ((kpis.catMap['Admin'] || 0) > (targets['Admin'] || 3) * 1.5 ? 'Consider delegation or automation.' : 'Within bounds.'),
      related: 'category:Admin',
    },
    {
      id: 'i8',
      severity: 'Low',
      title: 'Training and Development',
      detail: 'Training logged: ' + (kpis.catMap['Training'] || 0).toFixed(1) + 'h vs ' + (targets['Training'] || 2) + 'h target.',
      related: 'category:Training',
    },
  ]
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function fmtDate(d: string) {
  if (!d) return '-'
  const parts = d.split('-')
  return parts[2] + '/' + parts[1] + '/' + parts[0]
}
