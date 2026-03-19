import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FACE 커리어 진단 — 나다운 일의 단서를 찾아보세요';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
          padding: '64px 72px',
          position: 'relative',
        }}
      >
        {/* 배경 장식 원 */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* FACE 배지 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
            borderRadius: 10, padding: '6px 16px',
            fontSize: 14, fontWeight: 700, color: 'white', letterSpacing: 2,
            display: 'flex',
          }}>
            FACE Career Diagnosis
          </div>
        </div>

        {/* 메인 헤드라인 */}
        <div style={{
          fontSize: 54, fontWeight: 800, color: 'white',
          lineHeight: 1.2, marginBottom: 20, display: 'flex', flexDirection: 'column',
        }}>
          <span>나다운 일의 단서를</span>
          <span style={{ color: '#22C55E' }}>찾는 곳.</span>
        </div>

        {/* 서브 카피 */}
        <div style={{
          fontSize: 22, color: '#94A3B8', lineHeight: 1.6,
          marginBottom: 48, maxWidth: 620, display: 'flex',
        }}>
          15분 진단으로 직무 적합도·가치관·강점을 한눈에.
          내가 어떤 일에서 빛나는지 알 수 있어요.
        </div>

        {/* FACE 4축 태그 */}
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'Focus', sub: '집중 유형', color: '#F97316' },
            { label: 'Anchor', sub: '가치관 닻', color: '#8B5CF6' },
            { label: 'Capacity', sub: '역량 지도', color: '#3B82F6' },
            { label: 'Energy', sub: '에너지 단계', color: '#22C55E' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', flexDirection: 'column',
              padding: '12px 20px', borderRadius: 12,
              border: `1px solid ${item.color}40`,
              background: `${item.color}10`,
            }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.label}</span>
              <span style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{item.sub}</span>
            </div>
          ))}
        </div>

        {/* 하단 URL */}
        <div style={{
          position: 'absolute', bottom: 52, right: 72,
          fontSize: 16, color: '#475569', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'flex',
          }} />
          face.da-sh.io
        </div>
      </div>
    ),
    { ...size }
  );
}