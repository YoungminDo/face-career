import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const FOCUS_KOREAN: Record<string, string> = {
  Em: '교감형', Cr: '창작형', Op: '운영형', Ar: '설계형',
};
const FOCUS_COLORS: Record<string, string> = {
  Em: '#22C55E', Cr: '#F97316', Op: '#3B82F6', Ar: '#8B5CF6',
};

export async function GET(req: NextRequest) {
  const supabase = adminClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'all';
  const limit = parseInt(searchParams.get('limit') || '100');

  let query = supabase
    .from('diagnoses')
    .select('id, user_id, focus_primary, focus_subtype, energy_stage, energy_level, core_job_1, core_job_1_pct, desired_job, status, completed_at, created_at')
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 유저 이름 별도 조회
  const userIds = [...new Set((data || []).map((d: any) => d.user_id).filter(Boolean))];
  const { data: userRows } = userIds.length > 0
    ? await supabase.from('users').select('id, name').in('id', userIds)
    : { data: [] };
  const nameMap: Record<string, string> = {};
  (userRows || []).forEach((u: any) => { nameMap[u.id] = u.name; });

  const diagnoses = (data || []).map((d: any) => ({
    id: d.id.substring(0, 8),
    fullId: d.id,
    userId: d.user_id,
    name: nameMap[d.user_id] || '—',
    focusType: FOCUS_KOREAN[d.focus_primary] || '',
    focusColor: FOCUS_COLORS[d.focus_primary] || '#94A3B8',
    subTypeCode: d.focus_subtype || '',
    energyStage: d.energy_stage || '',
    energyLevel: d.energy_level || '',
    coreJob: d.core_job_1 || '',
    coreJobPct: d.core_job_1_pct || 0,
    status: d.status,
    date: d.completed_at
      ? new Date(d.completed_at).toLocaleDateString('ko-KR')
      : new Date(d.created_at).toLocaleDateString('ko-KR'),
  }));

  return NextResponse.json({ diagnoses });
}
