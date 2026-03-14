import { TimeLog, KpiData, BILLABLE_CATEGORIES, KpiRules, Insight, Category } from './types'

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
    flags.push({ level: 'High', msg: `Average daily hours (${kpis.avgPerDay}h) exceeds the ${rules.daily_hours_threshold}h threshold.` })

  if (kpis.billablePct < rules.billable_target)
    flags.push({ level: 'Med', msg: `Billable % (${kpis.billablePct}%) is below the ${rules.billable_target}% target.` })

  const mtgPct = kpis.totalHours > 0
    ? Math.round(((kpis.catMap['Meetings'] || 0) / kpis.totalHours) * 100)
    : 0
  if (mtgPct > 25)
    flags.push({ level: 'Med', msg: `Meetings account for ${mtgPct}% of total hours — above the 25% guideline.` })

  return flags
}

export function generateInsights(kpis: KpiData, rules: KpiRules, variant = 0): Insight[] {
  const targets = rules.category_targets as Record<Category, number>
  const v = variant

  const ins: Insight[] = [
    {
      id: 'i1',
      severity: kpis.avgPerDay > rules.daily_hours_threshold ? 'High' : 'Low',
      title: kpis.avgPerDay > rules.daily_hours_threshold ? 'Overload Risk Detected' : 'Hours Within Normal Range',
      detail: `Average daily hours are ${kpis.avgPerDay}h against a ${rules.daily_hours_threshold}h threshold. ${kpis.avgPerDay > rules.daily_hours_threshold ? 'Sustained overload increases burnout risk and reduces output quality.' : 'Workload appears balanced for the period.'}${v > 0 ? ' Pattern persists across the selected date range.' : ''}`,
      related: 'avgHours',
    },
    {
      id: 'i2',
      severity: kpis.billablePct < rules.billable_target ? 'High' : 'Low',
      title: kpis.billablePct < rules.billable_target ? 'Billable Target Not Met' : 'Billable Target Achieved',
      detail: `Billable hours represent ${kpis.billablePct}% of total logged time. The configured target is ${rules.billable_target}%. ${kpis.billablePct < rules.billable_target ? 'Internal and administrative work is absorbing delivery capacity.' : 'Billable utilisation is healthy.'}${v > 0 ? ' Review non-billable category breakdown for reallocation opportunities.' : ''}`,
      related: 'billable',
    },
    {
      id: 'i3',
      severity: (kpis.catMap['Meetings'] || 0) / (kpis.totalHours || 1) > 0.25 ? 'High' : 'Low',
      title: 'Meeting Load Analysis',
      detail: `Meetings consumed ${(kpis.catMap['Meetings'] || 0).toFixed(1)}h (${Math.round(((kpis.catMap['Meetings'] || 0) / (kpis.totalHours || 1)) * 100)}% of total). ${(kpis.catMap['Meetings'] || 0) / (kpis.totalHours || 1) > 0.25 ? 'High meeting load limits deep-work capacity. Consider async alternatives.' : 'Meeting load is within acceptable range.'}${v > 0 ? ' Compare against previous period to identify trend direction.' : ''}`,
      related: 'category:Meetings',
    },
    {
      id: 'i4',
      severity: (kpis.catMap['Development'] || 0) < (targets['Development'] || 20) ? 'Med' : 'Low',
      title: 'Development Hours vs Target',
      detail: `Development hours this period: ${(kpis.catMap['Development'] || 0).toFixed(1)}h. Configured target: ${targets['Development'] || 20}h. ${(kpis.catMap['Development'] || 0) < (targets['Development'] || 20) ? `Gap of ${((targets['Development'] || 20) - (kpis.catMap['Development'] || 0)).toFixed(1)}h may indicate blockers, scope change, or under-reporting.` : 'Development hours are on track.'}`,
      related: 'category:Development',
    },
    {
      id: 'i5',
      severity: kpis.topProject && kpis.totalHours > 0 && (kpis.topProject[1] / kpis.totalHours) > 0.6 ? 'Med' : 'Low',
      title: 'Project Concentration Risk',
      detail: `${kpis.topProject ? kpis.topProject[0] : 'Top project'} accounts for ${kpis.topProject && kpis.totalHours > 0 ? Math.round((kpis.topProject[1] / kpis.totalHours) * 100) : 0}% of all logged hours. ${kpis.topProject && (kpis.topProject[1] / kpis.totalHours) > 0.6 ? 'Heavy concentration creates delivery risk if resources are disrupted.' : 'Project spread appears balanced.'}${v > 0 ? ' Consider distributing capacity across more projects.' : ''}`,
      related: 'project',
    },
    {
      id: 'i6',
      severity: (kpis.catMap['Research'] || 0) < (targets['Research'] || 4) ? 'Low' : 'Low',
      title: 'Research Investment',
      detail: `Research hours logged: ${(kpis.catMap['Research'] || 0).toFixed(1)}h vs a ${targets['Research'] || 4}h target. ${(kpis.catMap['Research'] || 0) < (targets['Research'] || 4) ? 'Low research investment may limit innovation and continuous improvement over time.' : 'Research time is meeting targets.'}`,
      related: 'category:Research',
    },
    {
      id: 'i7',
      severity: (kpis.catMap['Admin'] || 0) > (targets['Admin'] || 3) * 1.5 ? 'Med' : 'Low',
      title: 'Administrative Overhead',
      detail: `Admin tasks consumed ${(kpis.catMap['Admin'] || 0).toFixed(1)}h. ${(kpis.catMap['Admin'] || 0) > (targets['Admin'] || 3) * 1.5 ? `This is ${(((kpis.catMap['Admin'] || 0) / (targets['Admin'] || 3) - 1) * 100).toFixed(0)}% above the category target. Consider delegation or process automation to recover capacity.` : 'Admin overhead is within acceptable bounds.'}`,
      related: 'category:Admin',
    },
    {
      id: 'i8',
      severity: (kpis.catMap['Training'] || 0) >= (targets['Training'] || 2) ? 'Low' : 'Low',
      title: 'Training & Development',
      detail: `Training logged: ${(kpis.catMap['Training'] || 0).toFixed(1)}h vs a ${targets['Training'] || 2}h target. ${(kpis.catMap['Training'] || 0) >= (targets['Training'] || 2) ? 'Learning investment is being maintained — positive signal for long-term capability.' : 'Training hours are below target. Sustained under-investment affects team capability.'}${v > 0 ? ' Track against quarterly learning objectives.' : ''}`,
      related: 'category:Training',
    },
  ]

  return ins
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function fmtDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function uid() {
  return Math.random().toString(36).slice(2, 9)
}