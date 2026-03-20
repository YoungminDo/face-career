'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { FOCUS_TYPES, ANCHOR_DEFS, COMP_NAMES } from '@/data/mappings';
import {
  calcFitScores, determineFitType, applyRefine,
  calcAnchorScores, getTopAnchors, calcInterestScores,
  calcCapacityScores, calcEnergyScores,
  calcJobFit, calcCategoryMatch, calcNadaumLevel, calculateAll,
} from '@/data/scoring';
import { JOB_COMPETENCY_MAPPING } from '@/data/mappings';
import type { FocusCode, AnchorKey } from '@/data/types';
import { anchorLikertQuestions } from '@/data/questions';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('face_diagnosis');
    router.push('/login');
  };

  useEffect(() => {
    const raw = localStorage.getItem('face_diagnosis');
    if (!raw) { setLoading(false); return; }

    try {
      const data = JSON.parse(raw);

      // Energy
      const energy = calcEnergyScores(data.energy || []);

      // Focus
      const focusScores = calcFitScores(data.focus || []);
      let focus = determineFitType(focusScores);
      if (focus.needsRefine && data.focusRefine?.length) {
        const refined = applyRefine(focusScores, data.focusRefine);
        focus = { ...focus, ...refined, subTypeCode: refined.primary + refined.secondary };
      }

      // Anchor
      const likertObj: Record<string, number> = {};
      anchorLikertQuestions.forEach((q: any, i: number) => {
        likertObj[q.anchor] = data.anchorLikert?.[i] || 4;
      });
      const anchorScores = calcAnchorScores(likertObj as any, data.anchorTradeoff || []);
      const top2 = getTopAnchors(anchorScores, 2);

      // Capacity
      const { scaled } = calcCapacityScores(data.capacity || []);

      // 코드 → 전체 이름 변환 (calcNadaumLevel, calcJobFit에서 사용)
      const codeToType: Record<string, string> = { Em: 'Empathy', Cr: 'Creative', Op: 'Operative', Ar: 'Architect' };
      const focusTypeName = codeToType[focus.primary] || focus.primary;
      const focusSecondaryName = codeToType[focus.secondary] || focus.secondary;

      // 나다움 역량 분류
      const allCodes = Object.keys(COMP_NAMES).filter(c => c !== 'Fd1' && c !== 'Fd2');
      const nadaumComps = allCodes.filter(c => calcNadaumLevel(c, focusTypeName, focusSecondaryName).level === 'nadaum');
      const halfNadaumComps = allCodes.filter(c => calcNadaumLevel(c, focusTypeName, focusSecondaryName).level === 'half_nadaum');
      const nonNadaumComps = allCodes.filter(c => calcNadaumLevel(c, focusTypeName, focusSecondaryName).level === 'non_nadaum');

      // TOP 5 강점 (점수 높은 순)
      const allScored = allCodes.map(c => ({ code: c, name: COMP_NAMES[c], score: scaled[c] || 25, nadaum: calcNadaumLevel(c, focusTypeName, focusSecondaryName) }));
      allScored.sort((a, b) => b.score - a.score);
      const top5 = allScored.slice(0, 5);
      const bottom3 = [...allScored].sort((a, b) => a.score - b.score).slice(0, 3);

      // 직무 적합도 TOP 5
      const jobFits = JOB_COMPETENCY_MAPPING.map(j => ({
        job: j.job, category: j.category,
        ...calcJobFit(scaled, focusTypeName, j.comps, focusSecondaryName),
      })).sort((a, b) => b.pct - a.pct);

      // 조직 매칭
      const catMatches = calcCategoryMatch(anchorScores);

      setResult({
        focus, energy, anchorScores, top2, scaled,
        nadaumComps, nonNadaumComps, top5, bottom3,
        jobFits, catMatches,
      });
    } catch (e) {
      console.error('Result parse error:', e);
    }
    setLoading(false);
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🔮</div>
        <p className="text-gray-500">결과를 분석하고 있습니다...</p>
      </div>
    </div>
  );

  if (!result) return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">진단 결과가 없습니다</h2>
        <p className="text-gray-500 mb-6">먼저 진단을 완료해주세요.</p>
        <a href="/diagnosis" className="bg-[#22C55E] text-white font-bold px-8 py-3 rounded-xl">진단 시작하기</a>
      </div>
    </div>
  );

  const { focus, energy, top2, scaled, top5, bottom3, jobFits, catMatches } = result;
  const CODE_TO_TYPE: Record<string, string> = { Em: 'Empathy', Cr: 'Creative', Op: 'Operative', Ar: 'Architect' };
  const primaryType = (FOCUS_TYPES as any)[CODE_TO_TYPE[focus.primary] || focus.primary];
  const secondaryType = (FOCUS_TYPES as any)[CODE_TO_TYPE[focus.secondary] || focus.secondary];
  const anchor1 = (ANCHOR_DEFS as any)[top2[0].anchor];
  const anchor2 = (ANCHOR_DEFS as any)[top2[1].anchor];
  // Sweet Spot 우선, 그 다음 잠재력, 그 다음 후천적 강점 순으로 Core Fit 추천
  const quadrantPriority: Record<string, number> = { sweet_spot: 0, potential: 1, acquired_str: 2, not_fit: 3 };
  const coreJobs = [...jobFits].sort((a: any, b: any) => {
    const pa = quadrantPriority[a.quadrant.code] ?? 3;
    const pb = quadrantPriority[b.quadrant.code] ?? 3;
    if (pa !== pb) return pa - pb;
    return b.pct - a.pct;
  }).slice(0, 3);
  const topOrg = catMatches[0];

  const subTypeName = `${secondaryType?.korean || ''}의 감각을 가진 ${primaryType?.korean || ''}`;

  const energyEmoji = energy.energyLevel === 'green' ? '🟢' : energy.energyLevel === 'yellow' ? '🟡' : '🔴';
  const energyLabel = energy.energyLevel === 'green' ? '도전 가능' : energy.energyLevel === 'yellow' ? '탐색 단계' : '회복 우선';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* 상단 네비 */}
        <div className="flex justify-between items-center mb-6">
          <a href="/mypage" className="text-sm text-gray-400">← 마이페이지</a>
          <button onClick={handleLogout} className="text-sm text-red-400 font-medium hover:text-red-600 transition-colors">
            로그아웃
          </button>
        </div>

        {/* 유형 히어로 */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{primaryType?.emoji || '✨'}</div>
          <h1 className="text-4xl font-black mb-1" style={{ color: primaryType?.color }}>
            {primaryType?.korean || focus.primary}
          </h1>
          <p className="text-gray-500 text-sm">{primaryType?.desc}</p>
          <p className="text-sm text-gray-400 mt-1">{subTypeName}</p>
        </div>

        {/* 4점수 바 */}
        <div className="bg-gray-50 rounded-2xl p-5 mb-6">
          {(['Em','Cr','Op','Ar'] as const).map(code => {
            const t = (FOCUS_TYPES as any)[{Em:'Empathy',Cr:'Creative',Op:'Operative',Ar:'Architect'}[code]];
            const score = focus.scores[code];
            const isPrimary = focus.primary === code || focus.primary === {Em:'Empathy',Cr:'Creative',Op:'Operative',Ar:'Architect'}[code];
            return (
              <div key={code} className="mb-3 last:mb-0">
                <div className="flex justify-between text-sm mb-1">
                  <span className={`font-bold ${isPrimary ? '' : 'text-gray-400'}`} style={isPrimary ? { color: t?.color } : {}}>
                    {isPrimary ? '● ' : ''}{t?.korean}
                  </span>
                  <span className="font-bold" style={isPrimary ? { color: t?.color } : { color: '#94A3B8' }}>{Math.round(score)}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(score/90)*100}%`, background: isPrimary ? t?.color : '#CBD5E1' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* FACE 4모듈 카드 */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="border-l-4 rounded-xl p-4" style={{ borderColor: primaryType?.color, background: `${primaryType?.color}10` }}>
            <div className="text-xs font-bold mb-1" style={{ color: primaryType?.color }}>FOCUS</div>
            <div className="text-base font-black">{primaryType?.korean}</div>
            <div className="text-xs text-gray-500 mt-1">{subTypeName}</div>
          </div>
          <div className="border-l-4 border-[#F97316] bg-orange-50 rounded-xl p-4">
            <div className="text-xs font-bold text-[#F97316] mb-1">ANCHOR</div>
            <div className="text-base font-bold">{anchor1?.emoji} {anchor1?.korean} × {anchor2?.emoji} {anchor2?.korean}</div>
          </div>
          <div className="border-l-4 border-[#3B82F6] bg-blue-50 rounded-xl p-4">
            <div className="text-xs font-bold text-[#3B82F6] mb-1">CAPACITY</div>
            <div className="space-y-1 mt-1">
              {top5.slice(0, 3).map((c: any) => (
                <div key={c.code} className="flex justify-between text-xs">
                  <span>{c.name}</span>
                  <span className="font-bold" style={{ color: c.score >= 60 ? '#22C55E' : '#EF4444' }}>{c.score}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-l-4 border-[#8B5CF6] bg-purple-50 rounded-xl p-4">
            <div className="text-xs font-bold text-[#8B5CF6] mb-1">ENERGY</div>
            <div className="inline-block text-xs font-bold px-2 py-1 rounded-full mb-1"
              style={{ background: energy.energyLevel === 'green' ? '#DCFCE7' : energy.energyLevel === 'yellow' ? '#FEF9C3' : '#FEE2E2',
                color: energy.energyLevel === 'green' ? '#166534' : energy.energyLevel === 'yellow' ? '#854D0E' : '#991B1B' }}>
              {energyEmoji} {energyLabel}
            </div>
            <div className="text-base font-bold">{energy.stage}</div>
          </div>
        </div>

        {/* 나다운 역량 */}
        <h3 className="text-lg font-bold mb-3">🟢 나다운 역량</h3>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-3">
          {top5.filter((c: any) => c.nadaum.level === 'nadaum' || c.nadaum.level === 'half_nadaum').map((c: any) => (
            <div key={c.code} className="flex justify-between items-center py-1.5">
              <span className="text-sm font-medium">
                {c.nadaum.emoji} {c.name}
                {c.nadaum.level === 'half_nadaum' && <span className="text-xs text-gray-400 ml-1">(확장)</span>}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-green-100 rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: c.nadaum.level === 'nadaum' ? '#22C55E' : '#EAB308' }} />
                </div>
                <span className="text-sm font-bold w-8 text-right" style={{ color: c.nadaum.level === 'nadaum' ? '#22C55E' : '#EAB308' }}>{c.score}</span>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-bold mb-3 mt-6">🔴 성장 포인트</h3>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
          {bottom3.map((c: any) => (
            <div key={c.code} className="flex justify-between items-center py-1.5">
              <span className="text-sm text-gray-500">{c.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-red-100 rounded-full">
                  <div className="h-full bg-[#EF4444] rounded-full" style={{ width: `${c.score}%` }} />
                </div>
                <span className="text-sm font-bold text-[#EF4444] w-8 text-right">{c.score}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Core Fit */}
        <h3 className="text-lg font-bold mb-4">🎯 Core Fit — 가장 잘 맞는 직무</h3>
        <div className="space-y-3 mb-8">
          {coreJobs.map((j: any, i: number) => (
            <div key={i} className="flex items-center gap-4 border border-gray-200 rounded-xl p-4">
              <div className="w-14 h-14 rounded-full text-white flex items-center justify-center text-lg font-black shrink-0"
                style={{ background: j.pct >= 60 ? '#22C55E' : j.pct >= 40 ? '#EAB308' : '#EF4444' }}>
                {j.pct}
              </div>
              <div className="flex-1">
                <div className="font-bold">{j.job}</div>
                <div className="text-xs text-gray-400">{j.category}</div>
                <div className="flex gap-1 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    background: j.quadrant.code === 'sweet_spot' ? '#DCFCE7' : j.quadrant.code === 'potential' ? '#DBEAFE' : '#F1F5F9',
                    color: j.quadrant.code === 'sweet_spot' ? '#166534' : j.quadrant.code === 'potential' ? '#1E40AF' : '#64748B',
                  }}>{j.quadrant.label}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 2×2 직무 지도 */}
        <h3 className="text-lg font-bold mb-4">📊 직무 지도</h3>
        <div className="grid grid-cols-2 gap-2 mb-8">
          <div className="bg-green-50 rounded-xl p-3">
            <div className="text-sm font-bold text-green-700 mb-2">🟢 Sweet Spot</div>
            {jobFits.filter((j: any) => j.quadrant.code === 'sweet_spot').slice(0, 4).map((j: any) => (
              <div key={j.job} className="text-xs text-green-600 mb-1">{j.job} {j.pct}%</div>
            ))}
          </div>
          <div className="bg-yellow-50 rounded-xl p-3">
            <div className="text-sm font-bold text-yellow-700 mb-2">🟡 후천적 강점</div>
            {jobFits.filter((j: any) => j.quadrant.code === 'acquired_str').slice(0, 4).map((j: any) => (
              <div key={j.job} className="text-xs text-yellow-600 mb-1">{j.job} {j.pct}%</div>
            ))}
          </div>
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="text-sm font-bold text-blue-700 mb-2">🔵 잠재력</div>
            {jobFits.filter((j: any) => j.quadrant.code === 'potential').slice(0, 4).map((j: any) => (
              <div key={j.job} className="text-xs text-blue-600 mb-1">{j.job} {j.pct}%</div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-sm font-bold text-gray-500 mb-2">🔴 비추천</div>
            {jobFits.filter((j: any) => j.quadrant.code === 'not_fit').slice(0, 4).map((j: any) => (
              <div key={j.job} className="text-xs text-gray-400 mb-1">{j.job} {j.pct}%</div>
            ))}
          </div>
        </div>

        {/* 추천 조직 */}
        <h3 className="text-lg font-bold mb-4">🏢 추천 조직</h3>
        <div className="space-y-2 mb-8">
          {catMatches.map((c: any, i: number) => (
            <div key={c.category} className="flex items-center gap-3">
              <span className="text-sm font-medium w-20">{c.korean}</span>
              <div className="flex-1 h-3 bg-gray-100 rounded-full">
                <div className="h-full rounded-full" style={{
                  width: `${c.similarity}%`,
                  background: i === 0 ? '#22C55E' : i === 1 ? '#3B82F6' : '#CBD5E1'
                }} />
              </div>
              <span className="text-sm font-bold w-10 text-right" style={{
                color: i === 0 ? '#22C55E' : i === 1 ? '#3B82F6' : '#94A3B8'
              }}>{c.similarity}%</span>
            </div>
          ))}
        </div>

        {/* Energy */}
        <h3 className="text-lg font-bold mb-4">⚡ 에너지 상태</h3>
        <div className="bg-gray-50 rounded-2xl p-5 mb-8">
          <div className="text-center mb-4">
            <span className="inline-block text-sm font-bold px-3 py-1 rounded-full"
              style={{ background: energy.energyLevel === 'green' ? '#DCFCE7' : energy.energyLevel === 'yellow' ? '#FEF9C3' : '#FEE2E2',
                color: energy.energyLevel === 'green' ? '#166534' : energy.energyLevel === 'yellow' ? '#854D0E' : '#991B1B' }}>
              {energyEmoji} {energyLabel}
            </span>
            <div className="text-2xl font-black mt-2">{energy.stage}</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">동기충족도</div>
              <div className="text-xl font-bold" style={{ color: energy.motivPct >= 70 ? '#22C55E' : energy.motivPct >= 40 ? '#EAB308' : '#EF4444' }}>
                {energy.motivPct}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">행동전환도</div>
              <div className="text-xl font-bold" style={{ color: energy.actionPct >= 50 ? '#22C55E' : energy.actionPct >= 30 ? '#EAB308' : '#EF4444' }}>
                {energy.actionPct}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">몰입도</div>
              <div className="text-xl font-bold" style={{ color: energy.engagementPct >= 60 ? '#22C55E' : energy.engagementPct >= 40 ? '#EAB308' : '#EF4444' }}>
                {energy.engagementPct}%
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#0F172A] rounded-2xl p-6 text-white mb-8">
          <p className="text-center text-lg font-bold mb-3">프리미엄 리포트에서 더 알 수 있는 것</p>
          <ul className="text-sm text-gray-300 space-y-2 mb-5">
            <li>• 16가지 세부 유형 심층 해석과 커리어 방향 가이드</li>
            <li>• 30개 역량 전체 점수표 및 나다움 역량 분석</li>
            <li>• 47개 직무 적합도 랭킹과 2×2 직무 지도</li>
            <li>• 조직 유형별 매칭도 및 추천 기업 카테고리</li>
            <li>• 에너지 상태에 맞춘 실천 액션 플랜</li>
          </ul>
          <div className="text-center">
            <button onClick={() => window.location.href = '/report'} className="bg-[#22C55E] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#16A34A] transition-colors">
              프리미엄 리포트 받기
            </button>
          </div>
        </div>

        {/* 다시하기 */}
        <div className="text-center">
          <button onClick={() => { localStorage.removeItem('face_diagnosis'); window.location.href = '/'; }}
            className="text-sm text-gray-400 underline">
            처음부터 다시하기
          </button>
        </div>
      </div>
    </div>
  );
}
