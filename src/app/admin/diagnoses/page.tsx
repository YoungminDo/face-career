'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';

const SAMPLE_DIAGNOSES = [
  { id: 'D001', name: '도영민', type: '창작형', sub: 'CrEm', energy: '성장활성기', energyLevel: 'green', coreJob: '콘텐츠기획', date: '2026-03-19', status: 'completed', reportGenerated: true },
  { id: 'D002', name: '김서연', type: '교감형', sub: 'EmOp', energy: '탐색진행기', energyLevel: 'yellow', coreJob: '채용', date: '2026-03-18', status: 'completed', reportGenerated: true },
  { id: 'D003', name: '이준호', type: '설계형', sub: 'ArCr', energy: '균형조율기', energyLevel: 'green', coreJob: '데이터사이언스', date: '2026-03-18', status: 'completed', reportGenerated: false },
  { id: 'D004', name: '박소영', type: '운영형', sub: 'OpEm', energy: '전환가속기', energyLevel: 'yellow', coreJob: '인사관리', date: '2026-03-17', status: 'completed', reportGenerated: false },
  { id: 'D005', name: '최민수', type: '', sub: '', energy: '', energyLevel: '', coreJob: '', date: '2026-03-17', status: 'in_progress', reportGenerated: false },
  { id: 'D006', name: '강아름', type: '교감형', sub: 'EmCr', energy: '성장활성기', energyLevel: 'green', coreJob: '조직문화', date: '2026-03-16', status: 'completed', reportGenerated: true },
  { id: 'D007', name: '유주호', type: '창작형', sub: 'CrAr', energy: '기반구축기', energyLevel: 'red', coreJob: 'UX/UI디자인', date: '2026-03-15', status: 'completed', reportGenerated: false },
];

const TYPE_COLORS: Record<string, string> = {
  '교감형': '#22C55E', '창작형': '#F97316', '운영형': '#3B82F6', '설계형': '#8B5CF6',
};

const ENERGY_COLORS: Record<string, { bg: string; color: string }> = {
  green: { bg: '#DCFCE7', color: '#166534' },
  yellow: { bg: '#FEF9C3', color: '#854D0E' },
  red: { bg: '#FEE2E2', color: '#991B1B' },
};

export default function DiagnosesPage() {
  const [filter, setFilter] = useState<'all' | 'completed' | 'in_progress'>('all');
  const filtered = SAMPLE_DIAGNOSES.filter(d =>
    filter === 'all' || d.status === filter
  );

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>진단 관리</h1>
      <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>전체 진단 현황과 결과를 조회합니다.</p>

      {/* 필터 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'all' as const, label: '전체', count: SAMPLE_DIAGNOSES.length },
          { key: 'completed' as const, label: '완료', count: SAMPLE_DIAGNOSES.filter(d => d.status === 'completed').length },
          { key: 'in_progress' as const, label: '진행 중', count: SAMPLE_DIAGNOSES.filter(d => d.status === 'in_progress').length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: filter === tab.key ? 700 : 400,
            background: filter === tab.key ? '#22C55E' : 'white',
            color: filter === tab.key ? 'white' : '#64748B',
          }}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>사용자</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Focus 유형</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Energy</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Core Fit</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>상태</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>리포트</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>날짜</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => {
              const ec = ENERGY_COLORS[d.energyLevel] || { bg: '#F1F5F9', color: '#94A3B8' };
              return (
                <tr key={d.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 11 }}>{d.id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{d.name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {d.type ? (
                      <span style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: (TYPE_COLORS[d.type] || '#94A3B8') + '20',
                        color: TYPE_COLORS[d.type] || '#94A3B8',
                      }}>{d.type} / {d.sub}</span>
                    ) : <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {d.energy ? (
                      <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: ec.bg, color: ec.color }}>
                        {d.energy}
                      </span>
                    ) : <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>{d.coreJob || '—'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: d.status === 'completed' ? '#DCFCE7' : '#FEF9C3',
                      color: d.status === 'completed' ? '#166534' : '#854D0E',
                    }}>{d.status === 'completed' ? '완료' : '진행 중'}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {d.reportGenerated ? (
                      <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 700 }}>✅ 생성됨</span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#CBD5E1' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94A3B8' }}>{d.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
