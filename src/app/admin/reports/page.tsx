'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

interface QueueItem {
  id: string;
  user_id: string | null;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  progress: number;
  report_url: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  started_at: string | null;
}

interface Stats {
  total: number;
  completed: number;
  failed: number;
  waiting: number;
  processing: number;
  avgSeconds: number | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  waiting:    { label: '대기 중',  color: '#F59E0B', bg: '#FEF3C7' },
  processing: { label: '처리 중',  color: '#3B82F6', bg: '#DBEAFE' },
  completed:  { label: '완료',     color: '#22C55E', bg: '#DCFCE7' },
  failed:     { label: '실패',     color: '#EF4444', bg: '#FEE2E2' },
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function calcAvgSeconds(items: QueueItem[]): number | null {
  const done = items.filter(i => i.status === 'completed' && i.started_at && i.completed_at);
  if (!done.length) return null;
  const total = done.reduce((acc, i) => {
    return acc + (new Date(i.completed_at!).getTime() - new Date(i.started_at!).getTime()) / 1000;
  }, 0);
  return Math.round(total / done.length);
}

export default function ReportsPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    try {
      const { data, error: fetchErr } = await supabase
        .from('report_queue')
        .select('id, user_id, status, progress, report_url, error_message, created_at, completed_at, started_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchErr) throw new Error(fetchErr.message);

      const list = (data as QueueItem[]) || [];
      setItems(list);
      setStats({
        total: list.length,
        completed: list.filter(i => i.status === 'completed').length,
        failed: list.filter(i => i.status === 'failed').length,
        waiting: list.filter(i => i.status === 'waiting').length,
        processing: list.filter(i => i.status === 'processing').length,
        avgSeconds: calcAvgSeconds(list),
      });
      setLastUpdated(new Date().toLocaleTimeString('ko-KR'));
      setError(null);
    } catch (err: any) {
      setError(err?.message || '데이터 조회 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = async (queueId: string) => {
    setRetrying(queueId);
    try {
      await fetch('/api/report/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId }),
      });
      setTimeout(loadData, 1500);
    } finally {
      setRetrying(null);
    }
  };

  // 최초 로드 + 처리 중인 항목 있으면 5초마다 자동 갱신
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const hasActive = items.some(i => i.status === 'waiting' || i.status === 'processing');
    if (!hasActive) return;
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [items, loadData]);

  const th: React.CSSProperties = {
    padding: '12px 16px', textAlign: 'left', fontWeight: 600,
    color: '#64748B', fontSize: 12, whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = {
    padding: '12px 16px', fontSize: 13, borderBottom: '1px solid #F1F5F9',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Admin / 리포트 관리</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, color: '#1E293B' }}>리포트 관리</h1>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
            PDF 생성 큐 현황. 처리 중인 항목이 있으면 5초마다 자동 갱신됩니다.
            {lastUpdated && <span style={{ marginLeft: 8, color: '#CBD5E1' }}>최근 갱신: {lastUpdated}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="/admin/diagnoses" style={{ padding: '8px 16px', borderRadius: 8, background: '#F1F5F9', color: '#475569', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            ← 진단 관리
          </a>
          <button onClick={loadData} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🔄 새로고침
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { label: '총 요청', value: stats.total, color: '#1E293B' },
            { label: '완료', value: stats.completed, color: '#22C55E' },
            { label: '실패', value: stats.failed, color: '#EF4444' },
            { label: '대기 중', value: stats.waiting, color: '#F59E0B' },
            { label: '처리 중', value: stats.processing, color: '#3B82F6' },
            { label: '평균 처리시간', value: stats.avgSeconds !== null ? `${stats.avgSeconds}초` : '—', color: '#8B5CF6' },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #E2E8F0', flex: 1, minWidth: 110 }}>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 12, padding: '16px 20px', color: '#B91C1C', fontSize: 14, marginBottom: 24 }}>
          데이터 조회 오류: {error}
        </div>
      )}

      {loading ? (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
          불러오는 중…
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {items.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
              생성된 리포트가 없습니다.<br />
              <a href="/admin/diagnoses" style={{ color: '#8B5CF6', fontWeight: 700, textDecoration: 'none', marginTop: 8, display: 'inline-block' }}>
                진단 관리에서 PDF 생성 →
              </a>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={th}>Queue ID</th>
                    <th style={th}>User ID</th>
                    <th style={th}>상태</th>
                    <th style={{ ...th, textAlign: 'center' }}>진행도</th>
                    <th style={th}>요청일시</th>
                    <th style={th}>완료일시</th>
                    <th style={{ ...th, textAlign: 'center' }}>리포트</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: '#64748B', bg: '#F1F5F9' };
                    return (
                      <tr key={item.id}>
                        <td style={{ ...td, fontFamily: 'monospace', color: '#64748B', fontSize: 11 }}>
                          {item.id.substring(0, 8)}…
                        </td>
                        <td style={{ ...td, color: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}>
                          {item.user_id ? item.user_id.substring(0, 8) + '…' : '—'}
                        </td>
                        <td style={td}>
                          <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                          {item.status === 'failed' && item.error_message && (
                            <div style={{ fontSize: 10, color: '#EF4444', marginTop: 4, maxWidth: 200, wordBreak: 'break-all', lineHeight: 1.4 }}>
                              {item.error_message}
                            </div>
                          )}
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          {item.status === 'processing' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                              <div style={{ width: 60, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${item.progress}%`, background: '#3B82F6', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 600 }}>{item.progress}%</span>
                            </div>
                          ) : item.status === 'completed' ? (
                            <span style={{ color: '#22C55E', fontWeight: 700 }}>100%</span>
                          ) : (
                            <span style={{ color: '#CBD5E1' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...td, color: '#64748B', whiteSpace: 'nowrap' }}>{formatDate(item.created_at)}</td>
                        <td style={{ ...td, color: '#64748B', whiteSpace: 'nowrap' }}>{formatDate(item.completed_at)}</td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          {item.report_url ? (
                            <a href={item.report_url} target="_blank" rel="noopener noreferrer" style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #22C55E', fontSize: 11, fontWeight: 600, background: 'white', color: '#22C55E', textDecoration: 'none', display: 'inline-block' }}>
                              다운로드
                            </a>
                          ) : (item.status === 'waiting' || item.status === 'failed') ? (
                            <button
                              onClick={() => handleRetry(item.id)}
                              disabled={retrying === item.id}
                              style={{ padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: retrying === item.id ? 'not-allowed' : 'pointer', background: item.status === 'failed' ? '#FEE2E2' : '#DBEAFE', color: item.status === 'failed' ? '#991B1B' : '#1D4ED8' }}
                            >
                              {retrying === item.id ? '실행 중…' : item.status === 'failed' ? '재시도' : '▶ 실행'}
                            </button>
                          ) : (
                            <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
