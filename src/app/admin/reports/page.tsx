'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
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
  waiting:    { label: '대기 중',   color: '#F59E0B', bg: '#FEF3C7' },
  processing: { label: '처리 중',   color: '#3B82F6', bg: '#DBEAFE' },
  completed:  { label: '완료',      color: '#22C55E', bg: '#DCFCE7' },
  failed:     { label: '실패',      color: '#EF4444', bg: '#FEE2E2' },
};

function formatDate(isoString: string | null) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function calcAvgSeconds(items: QueueItem[]): number | null {
  const completed = items.filter(
    (i) => i.status === 'completed' && i.started_at && i.completed_at
  );
  if (completed.length === 0) return null;
  const total = completed.reduce((acc, i) => {
    const s = new Date(i.started_at!).getTime();
    const e = new Date(i.completed_at!).getTime();
    return acc + (e - s) / 1000;
  }, 0);
  return Math.round(total / completed.length);
}

export default function ReportsPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
      || process.env.SUPABASE_SERVICE_ROLE_KEY;

    // service role key가 없으면 anon key로 fallback
    const key = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, key);

    (async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from('report_queue')
          .select('id, user_id, status, progress, report_url, error_message, created_at, completed_at, started_at')
          .order('created_at', { ascending: false })
          .limit(50);

        if (fetchErr) throw new Error(fetchErr.message);

        const list = (data as QueueItem[]) || [];
        setItems(list);

        const avgSeconds = calcAvgSeconds(list);
        setStats({
          total: list.length,
          completed: list.filter((i) => i.status === 'completed').length,
          failed: list.filter((i) => i.status === 'failed').length,
          waiting: list.filter((i) => i.status === 'waiting').length,
          processing: list.filter((i) => i.status === 'processing').length,
          avgSeconds,
        });
      } catch (err: any) {
        setError(err?.message || '데이터 조회 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const th: React.CSSProperties = {
    padding: '12px 16px', textAlign: 'left', fontWeight: 600,
    color: '#64748B', fontSize: 12, whiteSpace: 'nowrap',
  };

  const td: React.CSSProperties = {
    padding: '12px 16px', fontSize: 13, borderBottom: '1px solid #F1F5F9',
  };

  return (
    <div>
      {/* 페이지 헤더 */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>Admin / 리포트 관리</span>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, color: '#1E293B' }}>리포트 관리</h1>
      <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
        PDF 생성 큐 현황과 리포트 목록을 확인합니다. (최근 50건)
      </p>

      {/* 통계 카드 */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #E2E8F0', flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>총 생성 요청</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#1E293B' }}>{stats.total}</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #E2E8F0', flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>성공</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#22C55E' }}>{stats.completed}</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #E2E8F0', flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>실패</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#EF4444' }}>{stats.failed}</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #E2E8F0', flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>대기 / 처리 중</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#F59E0B' }}>
              {stats.waiting}
              <span style={{ fontSize: 16, color: '#3B82F6', marginLeft: 6 }}>/ {stats.processing}</span>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #E2E8F0', flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>평균 처리시간</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#8B5CF6' }}>
              {stats.avgSeconds !== null ? `${stats.avgSeconds}초` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div style={{
          background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 12,
          padding: '16px 20px', color: '#B91C1C', fontSize: 14, marginBottom: 24,
        }}>
          데이터 조회 오류: {error}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div style={{
          background: 'white', borderRadius: 16, border: '1px solid #E2E8F0',
          padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: 14,
        }}>
          불러오는 중...
        </div>
      )}

      {/* 테이블 */}
      {!loading && !error && (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {items.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
              생성된 리포트가 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={th}>ID</th>
                    <th style={th}>User ID</th>
                    <th style={th}>상태</th>
                    <th style={{ ...th, textAlign: 'center' }}>진행도</th>
                    <th style={th}>요청일시</th>
                    <th style={th}>완료일시</th>
                    <th style={{ ...th, textAlign: 'center' }}>리포트</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: '#64748B', bg: '#F1F5F9' };
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        {/* ID */}
                        <td style={{ ...td, fontFamily: 'monospace', color: '#64748B', fontSize: 11 }}>
                          {item.id.substring(0, 8)}…
                        </td>
                        {/* User ID */}
                        <td style={{ ...td, color: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}>
                          {item.user_id ? item.user_id.substring(0, 8) + '…' : '—'}
                        </td>
                        {/* 상태 배지 */}
                        <td style={td}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: cfg.bg, color: cfg.color,
                          }}>
                            {cfg.label}
                          </span>
                        </td>
                        {/* 진행도 */}
                        <td style={{ ...td, textAlign: 'center' }}>
                          {item.status === 'processing' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                              <div style={{
                                width: 60, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden',
                              }}>
                                <div style={{
                                  height: '100%', width: `${item.progress}%`,
                                  background: '#3B82F6', borderRadius: 3,
                                }} />
                              </div>
                              <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 600 }}>{item.progress}%</span>
                            </div>
                          ) : item.status === 'completed' ? (
                            <span style={{ color: '#22C55E', fontWeight: 700 }}>100%</span>
                          ) : (
                            <span style={{ color: '#CBD5E1' }}>—</span>
                          )}
                        </td>
                        {/* 요청일시 */}
                        <td style={{ ...td, color: '#64748B', whiteSpace: 'nowrap' }}>
                          {formatDate(item.created_at)}
                        </td>
                        {/* 완료일시 */}
                        <td style={{ ...td, color: '#64748B', whiteSpace: 'nowrap' }}>
                          {formatDate(item.completed_at)}
                        </td>
                        {/* 리포트 링크 */}
                        <td style={{ ...td, textAlign: 'center' }}>
                          {item.report_url ? (
                            <a
                              href={item.report_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '4px 12px', borderRadius: 6, border: '1px solid #22C55E',
                                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                background: 'white', color: '#22C55E', textDecoration: 'none',
                                display: 'inline-block',
                              }}
                            >
                              다운로드
                            </a>
                          ) : item.status === 'failed' && item.error_message ? (
                            <span style={{ fontSize: 11, color: '#EF4444' }} title={item.error_message}>
                              오류 보기
                            </span>
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