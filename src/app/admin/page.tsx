'use client';

import { useEffect, useState } from 'react';

// 샘플 데이터 (추후 API 연동)
const SAMPLE_USERS = [
  { name: '도영민', email: 'branden@da-sh.io', date: '2026-03-19', type: '창작형', status: '완료' },
  { name: '김서연', email: 'seoyeon@naver.com', date: '2026-03-18', type: '교감형', status: '완료' },
  { name: '이준호', email: 'junho@gmail.com', date: '2026-03-18', type: '설계형', status: '완료' },
  { name: '박소영', email: 'soyoung@korea.ac.kr', date: '2026-03-17', type: '운영형', status: '완료' },
  { name: '최민수', email: 'minsu@yonsei.ac.kr', date: '2026-03-17', type: '', status: '진행 중' },
];

const SAMPLE_DIAGNOSES = [
  { name: '도영민', type: '창작형', sub: 'CrEm', date: '2026-03-19', status: 'completed' },
  { name: '김서연', type: '교감형', sub: 'EmCr', date: '2026-03-18', status: 'completed' },
  { name: '이준호', type: '설계형', sub: 'ArOp', date: '2026-03-18', status: 'completed' },
  { name: '박소영', type: '운영형', sub: 'OpAr', date: '2026-03-17', status: 'completed' },
  { name: '최민수', type: '', sub: '', date: '2026-03-17', status: 'in_progress' },
];

const TYPE_COLORS: Record<string, string> = {
  '교감형': '#22C55E', '창작형': '#F97316', '운영형': '#3B82F6', '설계형': '#8B5CF6',
};

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: '20px 24px',
      border: '1px solid #E2E8F0', flex: 1, minWidth: 180,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', marginTop: 4 }}>{value}</div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: color + '20',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>{icon}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats] = useState({
    totalUsers: 149,
    totalDiagnoses: 177,
    completed: 143,
    reports: 6,
  });

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>Admin</span>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>대시보드</h1>
      <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>FACE 서비스 현황을 한눈에 확인하세요.</p>

      {/* 통계 카드 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <StatCard label="전체 사용자" value={stats.totalUsers} icon="👥" color="#3B82F6" />
        <StatCard label="전체 진단" value={stats.totalDiagnoses} icon="📋" color="#F97316" />
        <StatCard label="완료된 진단" value={stats.completed} icon="✅" color="#22C55E" />
        <StatCard label="생성된 리포트" value={stats.reports} icon="📄" color="#8B5CF6" />
      </div>

      {/* 최근 가입 + 최근 진단 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 최근 가입 사용자 */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>최근 가입 사용자</h3>
            <a href="/admin/users" style={{ fontSize: 12, color: '#3B82F6', textDecoration: 'none' }}>전체 보기</a>
          </div>
          {SAMPLE_USERS.map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < SAMPLE_USERS.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 18, background: '#E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#475569',
              }}>{u.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>{u.email}</div>
              </div>
              <div style={{ fontSize: 11, color: '#CBD5E1' }}>{u.date}</div>
            </div>
          ))}
        </div>

        {/* 최근 진단 */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>최근 진단</h3>
            <a href="/admin/diagnoses" style={{ fontSize: 12, color: '#3B82F6', textDecoration: 'none' }}>전체 보기</a>
          </div>
          {SAMPLE_DIAGNOSES.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < SAMPLE_DIAGNOSES.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 18,
                background: d.type ? (TYPE_COLORS[d.type] || '#94A3B8') + '20' : '#F1F5F9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700,
                color: d.type ? TYPE_COLORS[d.type] || '#94A3B8' : '#94A3B8',
              }}>{d.type ? d.type[0] : '?'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>
                  {d.type ? `${d.type} / ${d.sub}` : '진행 중'}
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
          ))}
        </div>
      </div>
    </div>
  );
}
