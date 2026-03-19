import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client (서버 전용 — 클라이언트에 노출 금지)
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// POST /api/admin/users — 계정 발급
export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: '이름, 이메일, 비밀번호를 모두 입력하세요.' }, { status: 400 });
  }

  const supabase = adminClient();

  // 1. Supabase Auth 계정 생성
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // 이메일 인증 없이 바로 활성화
  });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // 2. users 테이블에 프로필 저장
  const { error: profileError } = await supabase.from('users').insert({
    name,
    email,
    auth_id: authData.user.id,
  });
  if (profileError) {
    // Auth 계정은 생성됐으나 프로필 저장 실패 — Auth 계정도 삭제
    await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email });
}

// GET /api/admin/users — 전체 유저 목록
export async function GET() {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, birth_year, gender, current_status, created_at, auth_id')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 각 유저의 진단 건수 조회
  const { data: diagCounts } = await supabase
    .from('diagnoses')
    .select('user_id, focus_primary, completed_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  const usersWithCount = (data || []).map(u => {
    const userDiags = (diagCounts || []).filter(d => d.user_id === u.id);
    const latestFocus = userDiags[0]?.focus_primary || null;
    const focusKorean: Record<string, string> = {
      Em: '교감형', Cr: '창작형', Op: '운영형', Ar: '설계형',
    };
    return { ...u, diagCount: userDiags.length, focusType: latestFocus ? focusKorean[latestFocus] : null };
  });

  return NextResponse.json({ users: usersWithCount });
}