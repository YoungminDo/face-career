import { NextResponse } from 'next/server';
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

export async function GET() {
  const supabase = adminClient();

  const [
    { count: totalUsers },
    { count: totalDiagnoses },
    { count: completedDiagnoses },
    { data: recentUsers },
    { data: recentDiagnoses },
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('diagnoses').select('id', { count: 'exact', head: true }),
    supabase.from('diagnoses').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('users')
      .select('id, name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('diagnoses')
      .select('id, user_id, focus_primary, focus_subtype, energy_stage, energy_level, core_job_1, status, completed_at')
      .order('completed_at', { ascending: false })
      .limit(5),
  ]);

  // 최근 진단의 유저 이름 별도 조회
  const userIds = [...new Set((recentDiagnoses || []).map((d: any) => d.user_id).filter(Boolean))];
  const { data: userNames } = userIds.length > 0
    ? await supabase.from('users').select('id, name').in('id', userIds)
    : { data: [] };
  const nameMap: Record<string, string> = {};
  (userNames || []).forEach((u: any) => { nameMap[u.id] = u.name; });

  return NextResponse.json({
    stats: {
      totalUsers: totalUsers || 0,
      totalDiagnoses: totalDiagnoses || 0,
      completedDiagnoses: completedDiagnoses || 0,
    },
    recentUsers: recentUsers || [],
    recentDiagnoses: (recentDiagnoses || []).map((d: any) => ({
      id: d.id,
      name: nameMap[d.user_id] || '—',
      focusType: FOCUS_KOREAN[d.focus_primary] || '',
      focusColor: FOCUS_COLORS[d.focus_primary] || '#94A3B8',
      subTypeCode: d.focus_subtype || '',
      energyStage: d.energy_stage || '',
      energyLevel: d.energy_level || '',
      coreJob: d.core_job_1 || '',
      status: d.status,
      date: d.completed_at ? new Date(d.completed_at).toLocaleDateString('ko-KR') : '—',
    })),
  });
}
