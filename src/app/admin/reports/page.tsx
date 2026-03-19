'use client';

const SAMPLE_REPORTS = [
  { id: 'R001', user: '도영민', type: '창작형', sub: 'CrEm', generatedAt: '2026-03-19', plan: '프리미엄', pages: 30 },
  { id: 'R002', user: '김서연', type: '교감형', sub: 'EmOp', generatedAt: '2026-03-18', plan: '프리미엄', pages: 30 },
  { id: 'R003', user: '강아름', type: '교감형', sub: 'EmCr', generatedAt: '2026-03-16', plan: '기본', pages: 12 },
];

const TYPE_COLORS: Record<string, string> = {
  '교감형': '#22C55E', '창작형': '#F97316', '운영형': '#3B82F6', '설계형': '#8B5CF6',
};

export default function ReportsPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>리포트 관리</h1>
      <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>생성된 리포트 목록을 관리합니다.</p>

      {/* 통계 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #E2E8F0', flex: 1 }}>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>총 리포트</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{SAMPLE_REPORTS.length}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #E2E8F0', flex: 1 }}>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>프리미엄</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#8B5CF6' }}>{SAMPLE_REPORTS.filter(r => r.plan === '프리미엄').length}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #E2E8F0', flex: 1 }}>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>기본</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#64748B' }}>{SAMPLE_REPORTS.filter(r => r.plan === '기본').length}</div>
        </div>
      </div>

      {/* 테이블 */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>사용자</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>유형</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>플랜</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>페이지</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>생성일</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>액션</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_REPORTS.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 11 }}>{r.id}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.user}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: (TYPE_COLORS[r.type] || '#94A3B8') + '20',
                    color: TYPE_COLORS[r.type] || '#94A3B8',
                  }}>{r.type} / {r.sub}</span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: r.plan === '프리미엄' ? '#EDE9FE' : '#F1F5F9',
                    color: r.plan === '프리미엄' ? '#5B21B6' : '#64748B',
                  }}>{r.plan}</span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>{r.pages}p</td>
                <td style={{ padding: '12px 16px', color: '#94A3B8' }}>{r.generatedAt}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button style={{
                    padding: '4px 12px', borderRadius: 6, border: '1px solid #E2E8F0',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'white', color: '#475569',
                  }}>보기</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
