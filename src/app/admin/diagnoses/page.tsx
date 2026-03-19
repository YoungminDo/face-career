'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';

interface Diagnosis {
  id: string;
  fullId: string;
  userId: string;
  name: string;
  focusType: string;
  focusColor: string;
  subTypeCode: string;
  energyStage: string;
  energyLevel: string;
  coreJob: string;
  coreJobPct: number;
  status: string;
  date: string;
}

const ENERGY_COLORS: Record<string, { bg: string; color: string }> = {
  green:  { bg: '#DCFCE7', color: '#166534' },
  yellow: { bg: '#FEF9C3', color: '#854D0E' },
  red:    { bg: '#FEE2E2', color: '#991B1B' },
};

export default function DiagnosesPage() {
  const [filter, setFilter] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/diagnoses?status=${filter}&limit=100`);
    const json = await res.json();
    setDiagnoses(json.diagnoses || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const counts = { all: diagnoses.length, completed: diagnoses.filter(d => d.status === 'completed').length, in_progress: diagnoses.filter(d => d.status !== 'completed').length };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>진단 관리</h1>
      <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>전체 진단 현황과 결과를 조회합니다.</p>

      {/* 필터 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([
          { key: 'all', label: '전체' },
          { key: 'completed', label: '완료' },
          { key: 'in_progress', label: '진행 중' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: filter === tab.key ? 700 : 400,
            background: filter === tab.key ? '#22C55E' : 'white',
            color: filter === tab.key ? 'white' : '#64748B',
          }}>
            {tab.label} {filter === tab.key && !loading ? `(${counts[tab.key]})` : ''}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>불러오는 중…</div>
        ) : diagnoses.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>진단 기록이 없습니다.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>ID</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>사용자</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Focus 유형</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Energy</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Core Fit</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>상태</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>날짜</th>
              </tr>
            </thead>
            <tbody>
              {diagnoses.map(d => {
                const ec = ENERGY_COLORS[d.energyLevel] || { bg: '#F1F5F9', color: '#94A3B8' };
                return (
                  <tr key={d.fullId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}>{d.id}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{d.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {d.focusType ? (
                        <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: d.focusColor + '20', color: d.focusColor }}>
                          {d.focusType} / {d.subTypeCode}
                        </span>
                      ) : <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {d.energyStage ? (
                        <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: ec.bg, color: ec.color }}>
                          {d.energyStage}
                        </span>
                      ) : <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12 }}>
                      {d.coreJob ? `${d.coreJob} (${d.coreJobPct}%)` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: d.status === 'completed' ? '#DCFCE7' : '#FEF9C3',
                        color: d.status === 'completed' ? '#166534' : '#854D0E',
                      }}>
                        {d.status === 'completed' ? '완료' : '진행 중'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94A3B8' }}>{d.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
