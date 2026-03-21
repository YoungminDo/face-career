'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';

const TYPE_COLORS: Record<string, string> = {
  '교감형': '#22C55E', '창작형': '#F97316', '운영형': '#3B82F6', '설계형': '#8B5CF6',
};

interface User {
  id: string;
  name: string;
  email: string;
  birth_year: number | null;
  gender: string | null;
  current_status: string | null;
  created_at: string;
  diagCount: number;
  focusType: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    const json = await res.json();
    setUsers(json.users || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = users.filter(u =>
    u.name.includes(search) || (u.email || '').includes(search)
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    setCreateSuccess('');

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setCreating(false);

    if (!res.ok) {
      setCreateError(json.error || '계정 생성 실패');
      return;
    }
    setCreateSuccess(`✓ ${form.email} 계정이 발급됐습니다.`);
    setForm({ name: '', email: '', password: '' });
    loadUsers();
    setTimeout(() => { setShowModal(false); setCreateSuccess(''); }, 2000);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: 4, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900 }}>사용자 관리</h1>
        <button
          onClick={() => { setShowModal(true); setCreateError(''); setCreateSuccess(''); }}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: '#0F172A', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            alignSelf: isMobile ? 'flex-start' : 'auto',
          }}
        >
          + 계정 발급
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: isMobile ? 16 : 24 }}>전체 사용자 목록과 상세 정보를 확인합니다.</p>

      {/* 검색 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="이름 또는 이메일 검색"
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13, outline: 'none' }}
        />
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'white', border: '1px solid #E2E8F0', fontSize: 13, color: '#64748B', whiteSpace: 'nowrap' }}>
          {loading ? '…' : `${filtered.length}명`}
        </div>
      </div>

      {/* 모바일: 카드 리스트 / 데스크탑: 테이블 */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>사용자가 없습니다.</div>
          ) : filtered.map(u => (
            <div key={u.id} style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                  {u.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
                {u.focusType ? (
                  <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: (TYPE_COLORS[u.focusType] || '#94A3B8') + '20', color: TYPE_COLORS[u.focusType] || '#94A3B8', flexShrink: 0 }}>{u.focusType}</span>
                ) : <span style={{ fontSize: 11, color: '#CBD5E1', flexShrink: 0 }}>미진단</span>}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748B' }}>
                <span>{u.birth_year || '-'}년생</span>
                <span>{u.gender === 'male' ? '남성' : u.gender === 'female' ? '여성' : '-'}</span>
                <span>진단 {u.diagCount}회</span>
                <span style={{ marginLeft: 'auto', color: '#94A3B8' }}>{new Date(u.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>사용자</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>출생연도</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>성별</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>유형</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>진단 수</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>가입일</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>사용자가 없습니다.</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 16, background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                        {u.name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{u.birth_year || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {u.gender === 'male' ? '남성' : u.gender === 'female' ? '여성' : '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {u.focusType ? (
                      <span style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: (TYPE_COLORS[u.focusType] || '#94A3B8') + '20',
                        color: TYPE_COLORS[u.focusType] || '#94A3B8',
                      }}>{u.focusType}</span>
                    ) : <span style={{ fontSize: 11, color: '#CBD5E1' }}>미진단</span>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>{u.diagCount}</td>
                  <td style={{ padding: '12px 16px', color: '#94A3B8' }}>
                    {new Date(u.created_at).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 계정 발급 모달 */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'white', borderRadius: 20, padding: '36px 32px',
            width: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>계정 발급</h2>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 24 }}>새 유저에게 FACE 진단 접근 계정을 발급합니다.</p>

            <form onSubmit={handleCreate}>
              {['name', 'email', 'password'].map(field => (
                <div key={field} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                    {field === 'name' ? '이름' : field === 'email' ? '이메일(로그인 ID)' : '초기 비밀번호'}
                  </label>
                  <input
                    type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                    value={(form as any)[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={field === 'name' ? '홍길동' : field === 'email' ? 'hong@email.com' : '8자 이상 권장'}
                    required
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: '1.5px solid #E5E7EB', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}

              {createError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#DC2626', marginBottom: 12 }}>
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#16A34A', marginBottom: 12 }}>
                  {createSuccess}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  취소
                </button>
                <button type="submit" disabled={creating}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: creating ? '#94A3B8' : '#0F172A', color: 'white', fontSize: 13, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer' }}>
                  {creating ? '발급 중...' : '계정 발급'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
