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
          background: 'linear-gradient(135deg, #050D1A 0%, #0A1628 50%, #06101E 100%)',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* 배경 메쉬 그라디언트 */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex',
          background: 'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(34,197,94,0.12) 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex',
          background: 'radial-gradient(ellipse 60% 80% at 85% 30%, rgba(99,102,241,0.15) 0%, transparent 55%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex',
          background: 'radial-gradient(ellipse 50% 50% at 60% 80%, rgba(249,115,22,0.08) 0%, transparent 50%)' }} />

        {/* 배경 대형 FACE 워터마크 */}
        <div style={{
          position: 'absolute', top: -20, right: -20,
          fontSize: 280, fontWeight: 900, color: 'transparent',
          display: 'flex',
          WebkitTextStroke: '1px rgba(255,255,255,0.03)',
          letterSpacing: -8,
          userSelect: 'none',
        }}>
          FACE
        </div>

        {/* 격자 패턴 (미세) */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* ── 왼쪽 메인 콘텐츠 ── */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          padding: '52px 64px',
          flex: 1,
          justifyContent: 'space-between',
          position: 'relative',
        }}>
          {/* 상단 로고 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#22C55E', letterSpacing: -0.5 }}>FACE</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#475569', marginLeft: 8 }}>Career Diagnosis</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 100, padding: '4px 12px', gap: 6,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'flex' }} />
              <span style={{ fontSize: 12, color: '#22C55E', fontWeight: 600 }}>face.da-sh.io</span>
            </div>
          </div>

          {/* 중앙 메인 카피 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', marginBottom: 16 }}>
              <span style={{
                fontSize: 13, fontWeight: 700, color: '#22C55E',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 6, padding: '5px 12px', letterSpacing: 1.5,
              }}>
                FREE · 15분 · 완전 무료
              </span>
            </div>
            <div style={{
              fontSize: 64, fontWeight: 900, lineHeight: 1.1,
              letterSpacing: -2, display: 'flex', flexDirection: 'column',
            }}>
              <span style={{ color: 'white' }}>나다운 커리어의</span>
              <span style={{
                background: 'linear-gradient(90deg, #22C55E 0%, #16A34A 100%)',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}>단서를 찾아보세요</span>
            </div>
            <div style={{
              marginTop: 20, fontSize: 20, color: '#94A3B8', lineHeight: 1.65,
              maxWidth: 500, display: 'flex',
            }}>
              직무 적합도 · 핵심 가치관 · 역량 프로파일 · 에너지 패턴을 한 번에 분석합니다.
            </div>
          </div>

          {/* 하단 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
              borderRadius: 14, padding: '14px 28px',
              boxShadow: '0 0 40px rgba(34,197,94,0.3)',
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>무료로 시작하기 →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, color: '#64748B' }}>응답자</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#94A3B8' }}>1,200+명</span>
            </div>
          </div>
        </div>

        {/* ── 오른쪽: 4축 카드 ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '52px 56px 52px 0',
          gap: 12, width: 360,
          position: 'relative',
        }}>
          {/* 카드 배경 패널 */}
          <div style={{
            position: 'absolute', inset: '24px -10px',
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24, display: 'flex',
            backdropFilter: 'blur(10px)',
          }} />

          {[
            { label: 'F', name: 'Focus', sub: '집중 방식', color: '#F97316', pct: 78 },
            { label: 'A', name: 'Anchor', sub: '핵심 가치관', color: '#A78BFA', pct: 91 },
            { label: 'C', name: 'Capacity', sub: '역량 프로파일', color: '#60A5FA', pct: 65 },
            { label: 'E', name: 'Energy', sub: '에너지 패턴', color: '#34D399', pct: 83 },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', borderRadius: 16,
              background: `rgba(${item.color === '#F97316' ? '249,115,22' : item.color === '#A78BFA' ? '167,139,250' : item.color === '#60A5FA' ? '96,165,250' : '52,211,153'},0.06)`,
              border: `1px solid ${item.color}22`,
              position: 'relative',
            }}>
              {/* 컬러 레이블 */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `${item.color}18`, border: `1.5px solid ${item.color}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 900, color: item.color,
              }}>
                {item.label}
              </div>
              {/* 텍스트 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{item.name}</span>
                <span style={{ fontSize: 12, color: '#64748B' }}>{item.sub}</span>
              </div>
              {/* 퍼센트 바 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: item.color }}>{item.pct}</span>
                <div style={{ width: 48, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: 2 }} />
                </div>
              </div>
            </div>
          ))}

          {/* 하단 레이블 */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: '#334155', letterSpacing: 0.5 }}>
              샘플 진단 결과 미리보기
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
