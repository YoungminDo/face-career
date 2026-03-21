'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';

const TYPE_COLORS: Record<string, string> = {
  '교감형': '#22C55E', '창작형': '#F97316', '운영형': '#3B82F6', '설계형': '#8B5CF6',
};
const ENERGY_COLORS: Record<string, { bg: string; color: string }> = {
  green:  { bg: '#DCFCE7', color: '#166534' },
  yellow: { bg: '#FEF9C3', color: '#854D0E' },
  red:    { bg: '#FEE2E2', color: '#991B1B' },
};

function StatCard({ label, value, icon, color, mobile }: { label: string; value: number | string; icon: string; color: string; mobile?: boolean }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: mobile ? '16px 20px' : '20px 24px', border: '1px solid #E2E8F0', flex: 1, minWidth: mobile ? 0 : 180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: mobile ? 26 : 32, fontWeight: 900, color: '#1E293B', marginTop: 4 }}>{value}</div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, totalDiagnoses: 0, completedDiagnoses: 0 });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentDiagnoses, setRecentDiagnoses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => {
        setStats(d.stats || {});
        setRecentUsers(d.recentUsers || []);
        setRecentDiagnoses(d.recentDiagnoses || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {!isMobile && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>Admin</span>
        </div>
      )}
      <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, marginBottom: 4 }}>대시보드</h1>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: isMobile ? 16 : 24 }}>FACE 서비스 현황을 한눈에 확인하세요.</p>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 16, marginBottom: isMobile ? 20 : 32 }}>
        <StatCard label="전체 사용자" value={loading ? '…' : stats.totalUsers} icon="👥" color="#3B82F6" mobile={isMobile} />
        <StatCard label="전체 진단" value={loading ? '…' : stats.totalDiagnoses} icon="📋" color="#F97316" mobile={isMobile} />
        <StatCard label="완료된 진단" value={loading ? '…' : stats.completedDiagnoses} icon="✅" color="#22C55E" mobile={isMobile} />
      </div>

      {/* 최근 가입 + 최근 진단 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 16 : 24 }}>
        {/* 최근 가입 사용자 */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: isMobile ? 16 : 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>최근 가입 사용자</h3>
            <a href="/admin/users" style={{ fontSize: 12, color: '#3B82F6', textDecoration: 'none' }}>전체 보기</a>
          </div>
          {loading ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>불러오는 중…</div>
          ) : recentUsers.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: '#CBD5E1', fontSize: 13 }}>사용자가 없습니다.</div>
          ) : recentUsers.map((u: any, i: number) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < recentUsers.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#475569' }}>
                {(u.name || '?')[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>{u.email}</div>
              </div>
              <div style={{ fontSize: 11, color: '#CBD5E1' }}>
                {new Date(u.created_at).toLocaleDateString('ko-KR')}
              </div>
            </div>
          ))}
        </div>

        {/* 최근 진단 */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: isMobile ? 16 : 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>최근 진단</h3>
            <a href="/admin/diagnoses" style={{ fontSize: 12, color: '#3B82F6', textDecoration: 'none' }}>전체 보기</a>
          </div>
          {loading ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>불러오는 중…</div>
          ) : recentDiagnoses.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: '#CBD5E1', fontSize: 13 }}>진단 기록이 없습니다.</div>
          ) : recentDiagnoses.map((d: any, i: number) => {
            const ec = ENERGY_COLORS[d.energyLevel] || { bg: '#F1F5F9', color: '#94A3B8' };
            return (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < recentDiagnoses.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: d.focusType ? (TYPE_COLORS[d.focusType] || '#94A3B8') + '20' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: d.focusType ? TYPE_COLORS[d.focusType] || '#94A3B8' : '#94A3B8' }}>
                  {d.focusType ? d.focusType[0] : '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>
                    {d.focusType ? `${d.focusType} / ${d.subTypeCode}` : '진행 중'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {d.status === 'completed' ? (
                    <span style={{ fontSize: 11, color: '#22C55E' }}>✅ {d.date}</span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#F97316' }}>⏳ {d.date}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
