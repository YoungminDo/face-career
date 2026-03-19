'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }

    // users 테이블에 프로필 저장
    if (data.user) {
      await supabase.from('users').insert({ name, email, auth_id: data.user.id });
    }

    router.push('/diagnosis');
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
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 16, background: '#0F172A', marginBottom: 16,
          }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 20, letterSpacing: -1 }}>F</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A' }}>FACE Career</div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>진단 시작을 위해 계정을 만드세요</div>
        </div>

        <form onSubmit={handleSignup}>
          {[
            { id: 'name', label: '이름', type: 'text', value: name, set: setName, placeholder: '홍길동' },
            { id: 'email', label: '이메일(ID)', type: 'email', value: email, set: setEmail, placeholder: 'example@email.com' },
            { id: 'password', label: '비밀번호', type: 'password', value: password, set: setPassword, placeholder: '6자 이상' },
          ].map(f => (
            <div key={f.id} style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                {f.label}
              </label>
              <input
                type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
                placeholder={f.placeholder} required
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10,
                  border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  color: '#0F172A',
                }}
                onFocus={e => e.target.style.borderColor = '#0F172A'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
          ))}

          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: loading ? '#94A3B8' : '#0F172A', color: 'white',
            fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 12,
          }}>
            {loading ? '가입 중...' : '회원가입'}
          </button>

          <button type="button" onClick={() => router.push('/login')} style={{
            width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid #E5E7EB',
            background: 'white', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            이미 계정이 있으신가요? 로그인
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}