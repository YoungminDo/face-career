'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') || '/diagnosis';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    router.refresh();
    router.push(from);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#F8FAFC',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Pretendard Variable', sans-serif",
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: '48px 40px',
        width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 16, background: '#0F172A', marginBottom: 16,
          }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 20, letterSpacing: -1 }}>F</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A' }}>FACE Career</div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>커리어 진단 리포트 시스템</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              이메일(ID)
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com" required
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #E5E7EB',
                fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#0F172A',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#0F172A'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              비밀번호
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호 입력" required
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #E5E7EB',
                fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#0F172A',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#0F172A'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: loading ? '#94A3B8' : '#0F172A', color: 'white',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
          계정이 없으신가요?{' '}
          <a href="/signup" style={{ color: '#0F172A', fontWeight: 700, textDecoration: 'none' }}>
            회원가입
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}