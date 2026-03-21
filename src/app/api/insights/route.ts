import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { kpis, rules, userName, role } = await req.json()
    const catLines = Object.entries(kpis.catMap).map(function(e: any) { return e[0] + ': ' + e[1] + 'h' }).join('\n')
    const projLines = Object.entries(kpis.projMap).map(function(e: any) { return e[0] + ': ' + e[1] + 'h' }).join('\n')
    const targetLines = Object.entries(rules.category_targets || {}).map(function(e: any) { return e[0] + ': ' + e[1] + 'h' }).join('\n')
    const topProj = kpis.topProject ? kpis.topProject[0] + ' (' + kpis.topProject[1] + 'h)' : 'none'
    const topCat = kpis.topCategory ? kpis.topCategory[0] + ' (' + kpis.topCategory[1] + 'h)' : 'none'

    const prompt = [
      'You are a work intelligence analyst for CM Solutions, a metallurgical consultancy. Analyse this activity data and return exactly 8 insights as a JSON array.',
      'Each insight must have: id (i1-i8), severity (High/Med/Low), title (max 8 words), detail (2-3 sentences using actual numbers), related (metric or category).',
      'Return ONLY a valid JSON array. No markdown. No explanation.',
      '',
      'User: ' + userName + ' (Role: ' + role + ')',
      'Total hours: ' + kpis.totalHours + 'h over ' + kpis.activeDays + ' days',
      'Average per day: ' + kpis.avgPerDay + 'h (threshold: ' + rules.daily_hours_threshold + 'h)',
      'Billable: ' + kpis.billablePct + '% (target: ' + rules.billable_target + '%)',
      'Billable hours: ' + kpis.billableHours + 'h',
      'Top project: ' + topProj,
      'Top category: ' + topCat,
      '',
      'Category breakdown:',
      catLines,
      '',
      'Project breakdown:',
      projLines,
      '',
      'Category targets:',
      targetLines,
    ].join('\n')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json({ error: 'OpenAI API error: ' + errText }, { status: 500 })
    }

    const data = await response.json()
    const content = (data.choices[0].message.content || '[]').trim()
    const jsonStart = content.indexOf('[')
    const jsonEnd = content.lastIndexOf(']') + 1
    const clean = content.slice(jsonStart, jsonEnd)
    const insights = JSON.parse(clean)
    return NextResponse.json({ insights })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
