import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data } = await supabase.from('org_settings').select('*').limit(1).single()
  return NextResponse.json(data || { org_name: 'My Organisation' })
}
