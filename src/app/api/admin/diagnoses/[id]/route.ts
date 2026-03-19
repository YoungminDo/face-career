import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/admin/diagnoses/[id] — 진단 상세 (answers 포함)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = adminClient();

  const { data, error } = await supabase
    .from('diagnoses')
    .select('id, user_id, answers, desired_job, status, users(name)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // answers + userName + desiredJob 조합해서 diagnosisData 반환
  const userName = (data.users as any)?.name || '회원';
  const diagnosisData = {
    ...(data.answers || {}),
    userName,
    desiredJob: data.desired_job || null,
  };

  return NextResponse.json({ diagnosisData, userId: data.user_id });
}
