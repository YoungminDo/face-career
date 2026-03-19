'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
import {
  energyQuestions, fitQuestions, fitRefineQuestions,
  anchorLikertQuestions, anchorTradeoffQuestions, anchorInterestQuestions,
  capacityQuestions, QUESTION_COUNTS,
} from '@/data/questions';
import { FOCUS_TYPES, ANCHOR_DEFS, JOB_COMPETENCY_MAPPING } from '@/data/mappings';
import { calcFitScores, determineFitType, applyRefine, calcAnchorScores, getTopAnchors } from '@/data/scoring';
import type { FocusCode, AnchorKey } from '@/data/types';

type Phase = 'intro' | 'userinfo' | 'userinfo2' | 'energy' | 'energy_done' | 'focus' | 'focus_refine' | 'focus_done'
  | 'anchor_likert' | 'anchor_tradeoff' | 'anchor_interest' | 'anchor_done'
  | 'capacity' | 'complete';

const PHASE_META: Record<string, { label: string; color: string; desc: string }> = {
  energy: { label: 'Energy', color: '#8B5CF6', desc: '마음 준비 상태 체크' },
  focus: { label: 'Focus', color: '#22C55E', desc: '일할 때 집중하는 것' },
  focus_refine: { label: 'Focus 정제', color: '#22C55E', desc: '좀 더 정확히 확인' },
  anchor_likert: { label: 'Anchor', color: '#F97316', desc: '커리어 가치관' },
  anchor_tradeoff: { label: 'Anchor', color: '#F97316', desc: '가치관 우선순위' },
  anchor_interest: { label: 'Anchor', color: '#F97316', desc: '관심 영역' },
  capacity: { label: 'Capacity', color: '#3B82F6', desc: '직무 역량 측정' },
};

// 시드 기반 셔플 (문항별 고정 순서)
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function DiagnosisPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('intro');
  const [qIdx, setQIdx] = useState(0);
  const [answered, setAnswered] = useState(0);

  // 기본 정보
  const [userName, setUserName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [gender, setGender] = useState<'male'|'female'|null>(null);
  const [currentStatus, setCurrentStatus] = useState<'student'|'worker'|null>(null);
  const [hasDesiredJob, setHasDesiredJob] = useState<boolean|null>(null);
  const [desiredJob, setDesiredJob] = useState('');

  // 답변 저장
  const [energyAnswers, setEnergyAnswers] = useState<number[]>([]);
  const [focusAnswers, setFocusAnswers] = useState<{first:string;last:string}[]>([]);
  const [refineAnswers, setRefineAnswers] = useState<string[]>([]);
  const [anchorLikertAns, setAnchorLikertAns] = useState<number[]>([]);
  const [anchorTradeoffAns, setAnchorTradeoffAns] = useState<string[]>([]);
  const [anchorInterestAns, setAnchorInterestAns] = useState<{first:string;last:string}[]>([]);
  const [capacityAnswers, setCapacityAnswers] = useState<{first:string;last:string}[]>([]);

  // 현재 문항 임시 상태
  const [likertVal, setLikertVal] = useState<number|null>(null);
  const [rankFirst, setRankFirst] = useState<string|null>(null);
  const [rankLast, setRankLast] = useState<string|null>(null);
  const [singleChoice, setSingleChoice] = useState<string|null>(null);
  const [tradeoffChoice, setTradeoffChoice] = useState<'A'|'B'|null>(null);

  // 중간 결과
  const [focusResult, setFocusResult] = useState<any>(null);
  const [anchorResult, setAnchorResult] = useState<any>(null);

  const totalQ = QUESTION_COUNTS.totalMin;
  const progress = Math.min(100, Math.round((answered / totalQ) * 100));
  const meta = PHASE_META[phase] || { label: '', color: '#999', desc: '' };

  // === 리커트 제출 ===
  const submitLikert = useCallback((arr: number[], setArr: React.Dispatch<React.SetStateAction<number[]>>, nextPhase: Phase, maxQ: number) => {
    if (likertVal === null) return;
    const newArr = [...arr, likertVal];
    setArr(newArr);
    setAnswered(p => p + 1);
    setLikertVal(null);
    if (qIdx < maxQ - 1) setQIdx(p => p + 1);
    else { setQIdx(0); setPhase(nextPhase); }
  }, [likertVal, qIdx]);

  // === 랭킹(1위+4위) 제출 ===
  const submitRanking = useCallback((arr: {first:string;last:string}[], setArr: React.Dispatch<React.SetStateAction<{first:string;last:string}[]>>, nextPhase: Phase, maxQ: number) => {
    if (!rankFirst || !rankLast) return;
    const newArr = [...arr, { first: rankFirst, last: rankLast }];
    setArr(newArr);
    setAnswered(p => p + 1);
    setRankFirst(null); setRankLast(null);
    if (qIdx < maxQ - 1) setQIdx(p => p + 1);
    else { setQIdx(0); setPhase(nextPhase); }
  }, [rankFirst, rankLast, qIdx]);

  // === 단일선택 제출 (정제) ===
  const submitSingle = useCallback(() => {
    if (!singleChoice) return;
    const newArr = [...refineAnswers, singleChoice];
    setRefineAnswers(newArr);
    setAnswered(p => p + 1);
    setSingleChoice(null);
    if (qIdx < fitRefineQuestions.length - 1) setQIdx(p => p + 1);
    else {
      // 정제 결과 반영
      if (focusResult) {
        const refined = applyRefine(focusResult.scores, newArr as FocusCode[]);
        setFocusResult((prev: any) => ({ ...prev, primary: refined.primary, secondary: refined.secondary, subTypeCode: refined.primary + refined.secondary }));
      }
      setQIdx(0); setPhase('focus_done');
    }
  }, [singleChoice, qIdx, refineAnswers, focusResult]);

  // === 트레이드오프 제출 ===
  const submitTradeoff = useCallback(() => {
    if (!tradeoffChoice) return;
    const q = anchorTradeoffQuestions[qIdx] as any;
    const winner = tradeoffChoice === 'A' ? q.optionA.anchor : q.optionB.anchor;
    const newArr = [...anchorTradeoffAns, winner];
    setAnchorTradeoffAns(newArr);
    setAnswered(p => p + 1);
    setTradeoffChoice(null);
    if (qIdx < anchorTradeoffQuestions.length - 1) setQIdx(p => p + 1);
    else { setQIdx(0); setPhase('anchor_interest'); }
  }, [tradeoffChoice, qIdx, anchorTradeoffAns]);

  // === Energy 완료 → Focus ===
  const onEnergyDone = useCallback(() => {
    setPhase('focus'); setQIdx(0);
  }, []);

  // === Focus 완료 → 정제 체크 ===
  const onFocusDone = useCallback(() => {
    const scores = calcFitScores(focusAnswers as any);
    const result = determineFitType(scores);
    setFocusResult(result);
    if (result.needsRefine) {
      setPhase('focus_refine'); setQIdx(0);
    } else {
      setPhase('focus_done');
    }
  }, [focusAnswers]);

  // === Anchor 완료 ===
  const onAnchorDone = useCallback(() => {
    const likertObj: Record<string, number> = {};
    anchorLikertQuestions.forEach((q: any, i: number) => { likertObj[q.anchor] = anchorLikertAns[i] || 4; });
    const scores = calcAnchorScores(likertObj as any, anchorTradeoffAns as any);
    const top2 = getTopAnchors(scores);
    setAnchorResult({ scores, top2 });
    setPhase('anchor_done');
  }, [anchorLikertAns, anchorTradeoffAns]);

  // === 완료 → localStorage 저장 ===
  const onComplete = useCallback(() => {
    const data = {
      // 기본 정보
      userName,
      birthYear: birthYear || null,
      gender,
      currentStatus,
      desiredJob: hasDesiredJob ? desiredJob : null,
      // 진단 응답
      energy: energyAnswers,
      focus: focusAnswers,
      focusRefine: refineAnswers,
      focusResult,
      anchorLikert: anchorLikertAns,
      anchorTradeoff: anchorTradeoffAns,
      anchorInterest: anchorInterestAns,
      anchorResult,
      capacity: capacityAnswers,
      completedAt: new Date().toISOString(),
    };
    localStorage.setItem('face_diagnosis', JSON.stringify(data));

    // 진단 히스토리 저장 (localStorage)
    const history = JSON.parse(localStorage.getItem('face_diagnosis_history') || '[]');
    history.push({ ...data, id: Date.now().toString() });
    localStorage.setItem('face_diagnosis_history', JSON.stringify(history));

    // Supabase 저장 (비동기, 실패해도 결과 페이지로 이동)
    supabase.auth.getUser().then(({ data: { user } }) => {
      import('@/lib/saveDiagnosis').then(m =>
        m.saveDiagnosisToSupabase({ ...data, authId: user?.id })
      ).catch(() => {});
    });

    router.push('/result');
  }, [userName, birthYear, gender, currentStatus, hasDesiredJob, desiredJob, energyAnswers, focusAnswers, refineAnswers, focusResult, anchorLikertAns, anchorTradeoffAns, anchorInterestAns, anchorResult, capacityAnswers, router]);

  // === 이전으로 돌아가기 ===
  const goBack = useCallback(() => {
    // 현재 문항 임시 상태 초기화
    setLikertVal(null); setRankFirst(null); setRankLast(null);
    setSingleChoice(null); setTradeoffChoice(null);

    if (qIdx > 0) {
      // 같은 phase 내에서 이전 문항
      setQIdx(qIdx - 1);
      setAnswered(p => Math.max(0, p - 1));

      // 마지막 답변 제거
      if (phase === 'energy') { setEnergyAnswers(p => p.slice(0, -1)); setLikertVal(energyAnswers[energyAnswers.length - 1] ?? null); }
      else if (phase === 'focus') { setFocusAnswers(p => p.slice(0, -1)); }
      else if (phase === 'focus_refine') { setRefineAnswers(p => p.slice(0, -1)); }
      else if (phase === 'anchor_likert') { setAnchorLikertAns(p => p.slice(0, -1)); setLikertVal(anchorLikertAns[anchorLikertAns.length - 1] ?? null); }
      else if (phase === 'anchor_tradeoff') { setAnchorTradeoffAns(p => p.slice(0, -1)); }
      else if (phase === 'anchor_interest') { setAnchorInterestAns(p => p.slice(0, -1)); }
      else if (phase === 'capacity') { setCapacityAnswers(p => p.slice(0, -1)); }
    } else {
      // phase 첫 문항이면 이전 phase 마지막 문항으로
      if (phase === 'focus') { setPhase('energy'); setQIdx(energyQuestions.length - 1); setEnergyAnswers(p => p.slice(0, -1)); setAnswered(p => Math.max(0, p - 1)); }
      else if (phase === 'focus_refine') { setPhase('focus'); setQIdx(fitQuestions.length - 1); setFocusAnswers(p => p.slice(0, -1)); setAnswered(p => Math.max(0, p - 1)); }
      else if (phase === 'anchor_likert') { setPhase('focus'); setQIdx(fitQuestions.length - 1); setFocusAnswers(p => p.slice(0, -1)); setAnswered(p => Math.max(0, p - 1)); }
      else if (phase === 'anchor_tradeoff') { setPhase('anchor_likert'); setQIdx(anchorLikertQuestions.length - 1); setAnchorLikertAns(p => p.slice(0, -1)); setAnswered(p => Math.max(0, p - 1)); }
      else if (phase === 'anchor_interest') { setPhase('anchor_tradeoff'); setQIdx(anchorTradeoffQuestions.length - 1); setAnchorTradeoffAns(p => p.slice(0, -1)); setAnswered(p => Math.max(0, p - 1)); }
      else if (phase === 'capacity') { setPhase('anchor_interest'); setQIdx(anchorInterestQuestions.length - 1); setAnchorInterestAns(p => p.slice(0, -1)); setAnswered(p => Math.max(0, p - 1)); }
      // energy 첫 문항이면 더 이상 뒤로 못 감
    }
  }, [phase, qIdx, energyAnswers, focusAnswers, refineAnswers, anchorLikertAns, anchorTradeoffAns, anchorInterestAns, capacityAnswers]);

  const canGoBack = !(phase === 'energy' && qIdx === 0);

  // =============================================
  // RENDER
  // =============================================

  // === 인트로 ===
  if (phase === 'intro') return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-4xl font-black text-[#22C55E] mb-2">FACE</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>커리어 진단을 시작합니다</h2>
        <p className="text-sm mb-8" style={{ color: '#6B7280' }}>편하게 답해주세요. 정답은 없습니다.</p>
        <div className="bg-gray-50 rounded-2xl p-5 mb-8 text-left space-y-3">
          {[
            { c: '#8B5CF6', l: 'Energy (마음 상태)', n: '16문항' },
            { c: '#22C55E', l: 'Focus (집중하는 것)', n: '18문항' },
            { c: '#F97316', l: 'Anchor (가치관)', n: '18문항' },
            { c: '#3B82F6', l: 'Capacity (역량)', n: '24문항' },
          ].map(m => (
            <div key={m.l} className="flex items-center gap-3 text-sm">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.c }} />
              <span className="flex-1" style={{ color: '#374151' }}>{m.l}</span>
              <span style={{ color: '#9CA3AF' }}>{m.n}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setPhase('userinfo')}
          className="w-full bg-[#8B5CF6] text-white font-bold py-4 rounded-2xl text-lg">
          시작하기
        </button>
        <p className="text-xs text-gray-400 mt-4">약 20분 소요</p>
      </div>
    </div>
  );

  if (phase === 'userinfo') return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-[#22C55E] mb-2">FACE</div>
          <h2 className="text-lg font-bold mb-1">기본 정보 입력</h2>
          <p className="text-sm text-gray-500">진단을 시작하기 전에 기본 정보를 입력해주세요</p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 space-y-5">
          <div>
            <label className="text-sm font-bold text-gray-700 mb-1 block">이름 <span className="text-red-500">*</span></label>
            <input
              type="text" value={userName} onChange={e => setUserName(e.target.value)}
              placeholder="홍길동"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#22C55E]"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 mb-1 block">출생연도</label>
            <input
              type="number" value={birthYear} onChange={e => setBirthYear(e.target.value)}
              placeholder="2000" min="1970" max="2010"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#22C55E]"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">성별</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setGender('male')}
                className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${gender === 'male' ? 'border-[#22C55E] bg-green-50 text-[#22C55E]' : 'border-gray-200 text-gray-400'}`}>
                남성
              </button>
              <button onClick={() => setGender('female')}
                className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${gender === 'female' ? 'border-[#22C55E] bg-green-50 text-[#22C55E]' : 'border-gray-200 text-gray-400'}`}>
                여성
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button onClick={() => setPhase('intro')}
            className="py-4 rounded-2xl text-sm font-bold border border-gray-200 text-gray-500">
            이전
          </button>
          <button onClick={() => setPhase('userinfo2')}
            disabled={!userName.trim()}
            className={`py-4 rounded-2xl text-sm font-bold ${userName.trim() ? 'bg-[#8B5CF6] text-white' : 'bg-gray-100 text-gray-300'}`}>
            다음
          </button>
        </div>
      </div>
    </div>
  );

  if (phase === 'userinfo2') {
    const categories = [...new Set(JOB_COMPETENCY_MAPPING.map(j => j.category))];
    const selectedCatJobs = JOB_COMPETENCY_MAPPING.filter(j => j.category === desiredJob.split('|')[0]);
    const selectedCategory = desiredJob.split('|')[0] || '';
    const selectedJobName = desiredJob.split('|')[1] || '';

    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-3xl font-black text-[#22C55E] mb-2">FACE</div>
            <h2 className="text-lg font-bold mb-1">직무 정보</h2>
            <p className="text-sm text-gray-500">맞춤형 역량 진단을 위해 몇 가지 정보가 필요해요</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 space-y-5">
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">현재 상태가 어떻게 되시나요?</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setCurrentStatus('student')}
                  className={`py-4 rounded-xl border-2 transition-all ${currentStatus === 'student' ? 'border-[#22C55E] bg-green-50' : 'border-gray-200'}`}>
                  <div className="text-sm font-bold">취업 준비생</div>
                  <div className="text-xs text-gray-400 mt-1">구직 중이거나 취업 준비</div>
                </button>
                <button onClick={() => setCurrentStatus('worker')}
                  className={`py-4 rounded-xl border-2 transition-all ${currentStatus === 'worker' ? 'border-[#22C55E] bg-green-50' : 'border-gray-200'}`}>
                  <div className="text-sm font-bold">직장인</div>
                  <div className="text-xs text-gray-400 mt-1">현재 직장에 재직 중</div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">희망하는 직무가 있으신가요?</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setHasDesiredJob(false); setDesiredJob(''); }}
                  className={`py-4 rounded-xl border-2 transition-all ${hasDesiredJob === false ? 'border-[#22C55E] bg-green-50' : 'border-gray-200'}`}>
                  <div className="text-sm font-bold">아직 없어요</div>
                  <div className="text-xs text-gray-400 mt-1">천천히 찾아볼게요</div>
                </button>
                <button onClick={() => setHasDesiredJob(true)}
                  className={`py-4 rounded-xl border-2 transition-all ${hasDesiredJob === true ? 'border-[#22C55E] bg-green-50' : 'border-gray-200'}`}>
                  <div className="text-sm font-bold">있어요</div>
                  <div className="text-xs text-gray-400 mt-1">희망 직무가 있어요</div>
                </button>
              </div>
            </div>

            {hasDesiredJob === true && (
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700 block">잘 맞는지 분석 원하는 직무</label>
                <div>
                  <div className="text-xs text-gray-400 mb-1">대분류</div>
                  <select
                    value={selectedCategory}
                    onChange={e => setDesiredJob(e.target.value + '|')}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#22C55E]"
                  >
                    <option value="">선택</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {selectedCategory && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">소분류</div>
                    <select
                      value={selectedJobName}
                      onChange={e => setDesiredJob(selectedCategory + '|' + e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#22C55E]"
                    >
                      <option value="">선택</option>
                      {selectedCatJobs.map(j => <option key={j.job} value={j.job}>{j.job}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button onClick={() => setPhase('userinfo')}
              className="py-4 rounded-2xl text-sm font-bold border border-gray-200 text-gray-500">
              이전
            </button>
            <button onClick={() => { setPhase('energy'); setQIdx(0); }}
              disabled={!currentStatus || hasDesiredJob === null}
              className={`py-4 rounded-2xl text-sm font-bold ${currentStatus && hasDesiredJob !== null ? 'bg-[#8B5CF6] text-white' : 'bg-gray-100 text-gray-300'}`}>
              진단 시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === 모듈 전환 화면들 ===
  if (phase === 'energy_done') return (
    <TransitionScreen emoji="⚡" title="에너지 체크 완료!" sub="다음은 일할 때 무엇에 집중하는지 알아볼게요." color="#8B5CF6" onNext={onEnergyDone} />
  );
  if (phase === 'focus_done') {
    const CODE_TO_TYPE: Record<string, string> = { Em: 'Empathy', Cr: 'Creative', Op: 'Operative', Ar: 'Architect' };
    const focusTypeName = focusResult ? (FOCUS_TYPES as any)[CODE_TO_TYPE[focusResult.primary]]?.korean || '' : '';
    const focusTypeEmoji = focusResult ? (FOCUS_TYPES as any)[CODE_TO_TYPE[focusResult.primary]]?.emoji || '✨' : '✨';
    return (
    <TransitionScreen
      emoji={focusTypeEmoji}
      title={`당신은 ${focusTypeName} 성향이에요!`}
      sub="다음은 커리어 가치관을 확인합니다."
      color="#22C55E"
      onNext={() => { setPhase('anchor_likert'); setQIdx(0); }}
    />
  );
  }
  if (phase === 'anchor_done') return (
    <TransitionScreen
      emoji="⚓"
      title={`핵심 가치: ${anchorResult?.top2?.[0] ? (ANCHOR_DEFS as any)[anchorResult.top2[0].anchor]?.korean : ''} × ${anchorResult?.top2?.[1] ? (ANCHOR_DEFS as any)[anchorResult.top2[1].anchor]?.korean : ''}`}
      sub="마지막! 직무 역량을 측정합니다. 끝나면 결과를 볼 수 있어요."
      color="#F97316"
      onNext={() => { setPhase('capacity'); setQIdx(0); }}
    />
  );

  // === 완료 ===
  if (phase === 'complete') return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">진단 완료!</h2>
        <p className="text-gray-500 mb-8">{answered}개 문항 응답 완료</p>
        <button onClick={onComplete}
          className="w-full bg-[#22C55E] text-white font-bold py-4 rounded-2xl text-lg">
          결과 보기
        </button>
      </div>
    </div>
  );

  // === 메인 진단 화면 ===
  return (
    <div className="min-h-screen bg-white">
      {/* 진행 바 + 이전 버튼 */}
      <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 z-50">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-3">
              {canGoBack && (
                <button onClick={goBack} className="text-gray-400 hover:text-gray-600 transition-colors text-sm font-medium flex items-center gap-1">
                  <span>←</span> 이전
                </button>
              )}
              <span className="text-sm font-bold" style={{ color: meta.color }}>{meta.label}</span>
            </div>
            <span className="text-xs text-gray-400">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: meta.color }} /></div>
          <p className="text-xs text-gray-400 mt-1">{meta.desc}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">

        {/* === Energy 리커트 === */}
        {phase === 'energy' && (
          <LikertUI
            q={energyQuestions[qIdx] as any}
            idx={qIdx} total={energyQuestions.length}
            value={likertVal} onChange={setLikertVal}
            onSubmit={() => submitLikert(energyAnswers, setEnergyAnswers, 'energy_done', energyQuestions.length)}
            color="#8B5CF6"
          />
        )}

        {/* === Focus 랭킹 === */}
        {phase === 'focus' && (
          <RankingUI
            q={fitQuestions[qIdx] as any}
            idx={qIdx} total={fitQuestions.length}
            options={seededShuffle(['Em','Cr','Op','Ar'], qIdx * 7 + 13).map(k => ({ key: k, text: (fitQuestions[qIdx] as any)[k] }))}
            first={rankFirst} last={rankLast}
            onFirst={setRankFirst} onLast={setRankLast}
            onSubmit={() => submitRanking(focusAnswers, setFocusAnswers, 'focus' as any, fitQuestions.length)}
            onDone={onFocusDone}
            isLast={qIdx === fitQuestions.length - 1}
            color="#22C55E"
          />
        )}

        {/* === Focus 정제 (단일선택) === */}
        {phase === 'focus_refine' && (
          <SingleChoiceUI
            q={fitRefineQuestions[qIdx] as any}
            idx={qIdx} total={fitRefineQuestions.length}
            options={seededShuffle(['Em','Cr','Op','Ar'], qIdx * 11 + 37).map(k => ({ key: k, text: (fitRefineQuestions[qIdx] as any)[k] }))}
            selected={singleChoice}
            onSelect={setSingleChoice}
            onSubmit={submitSingle}
            color="#22C55E"
          />
        )}

        {/* === Anchor 리커트 === */}
        {phase === 'anchor_likert' && (
          <LikertUI
            q={anchorLikertQuestions[qIdx] as any}
            idx={qIdx} total={anchorLikertQuestions.length}
            value={likertVal} onChange={setLikertVal}
            onSubmit={() => submitLikert(anchorLikertAns, setAnchorLikertAns, 'anchor_tradeoff', anchorLikertQuestions.length)}
            color="#F97316"
          />
        )}

        {/* === Anchor 트레이드오프 === */}
        {phase === 'anchor_tradeoff' && (() => {
          const q = anchorTradeoffQuestions[qIdx] as any;
          return (
            <div>
              <div className="text-center text-xs text-gray-400 mb-6">{qIdx+1} / {anchorTradeoffQuestions.length}</div>
              <h3 className="text-lg font-bold text-center mb-6">{q.question}</h3>
              <div className="space-y-3 mb-6">
                <button onClick={() => setTradeoffChoice('A')}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all ${tradeoffChoice==='A' ? 'border-[#F97316] bg-orange-50' : 'border-gray-200'}`}>
                  <div className="text-xs text-gray-400 mb-1">A</div>
                  <div className="text-sm font-medium">{q.optionA.text}</div>
                </button>
                <button onClick={() => setTradeoffChoice('B')}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all ${tradeoffChoice==='B' ? 'border-[#F97316] bg-orange-50' : 'border-gray-200'}`}>
                  <div className="text-xs text-gray-400 mb-1">B</div>
                  <div className="text-sm font-medium">{q.optionB.text}</div>
                </button>
              </div>
              <button onClick={submitTradeoff} disabled={!tradeoffChoice}
                className={`w-full py-4 rounded-2xl text-lg font-bold ${tradeoffChoice ? 'bg-[#F97316] text-white' : 'bg-gray-100 text-gray-300'}`}>
                다음
              </button>
            </div>
          );
        })()}

        {/* === Anchor 관심영역 랭킹 === */}
        {phase === 'anchor_interest' && (() => {
          const q = anchorInterestQuestions[qIdx] as any;
          return (
            <RankingUI
              q={q}
              idx={qIdx} total={anchorInterestQuestions.length}
              options={q.options.map((o:any) => ({ key: o.direction, text: o.text }))}
              first={rankFirst} last={rankLast}
              onFirst={setRankFirst} onLast={setRankLast}
              onSubmit={() => submitRanking(anchorInterestAns, setAnchorInterestAns, 'anchor_interest' as any, anchorInterestQuestions.length)}
              onDone={onAnchorDone}
              isLast={qIdx === anchorInterestQuestions.length - 1}
              color="#F97316"
            />
          );
        })()}

        {/* === Capacity 랭킹 === */}
        {phase === 'capacity' && (() => {
          const q = capacityQuestions[qIdx] as any;
          return (
            <RankingUI
              q={q}
              idx={qIdx} total={capacityQuestions.length}
              options={q.options.map((o:any) => ({ key: o.code, text: o.text }))}
              first={rankFirst} last={rankLast}
              onFirst={setRankFirst} onLast={setRankLast}
              onSubmit={() => submitRanking(capacityAnswers, setCapacityAnswers, 'capacity' as any, capacityQuestions.length)}
              onDone={() => setPhase('complete')}
              isLast={qIdx === capacityQuestions.length - 1}
              color="#3B82F6"
            />
          );
        })()}
      </div>
    </div>
  );
}

// ─── Sub Components ───

function TransitionScreen({ emoji, title, sub, color, onNext }: { emoji: string; title: string; sub: string; color: string; onNext: () => void }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4">{emoji}</div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-gray-500 text-sm mb-8">{sub}</p>
        <button onClick={onNext} className="w-full text-white font-bold py-4 rounded-2xl text-lg" style={{ background: color }}>
          다음으로
        </button>
      </div>
    </div>
  );
}

function LikertUI({ q, idx, total, value, onChange, onSubmit, color }: any) {
  return (
    <div>
      <div className="text-center text-xs text-gray-400 mb-6">{idx+1} / {total}</div>
      <h3 className="text-lg font-bold text-center mb-8 leading-relaxed">{q.question}</h3>
      <div className="flex justify-between mb-3 px-1">
        <span className="text-xs text-gray-400">전혀 아니다</span>
        <span className="text-xs text-gray-400">매우 그렇다</span>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-8">
        {[1,2,3,4,5,6,7].map(n => (
          <button key={n} onClick={() => onChange(n)}
            className={`aspect-square rounded-xl text-lg font-bold transition-all ${value===n ? 'text-white scale-110 shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            style={value===n ? { background: color } : {}}>
            {n}
          </button>
        ))}
      </div>
      <button onClick={onSubmit} disabled={value===null}
        className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${value!==null ? 'text-white' : 'bg-gray-100 text-gray-300'}`}
        style={value!==null ? { background: color } : {}}>
        다음
      </button>
    </div>
  );
}

function RankingUI({ q, idx, total, options, first, last, onFirst, onLast, onSubmit, onDone, isLast, color }: any) {
  const handleSubmit = () => {
    if (isLast) { onSubmit(); setTimeout(onDone, 0); }
    else onSubmit();
  };
  return (
    <div>
      <div className="text-center text-xs text-gray-400 mb-4">{idx+1} / {total}</div>
      <h3 className="text-lg font-bold text-center mb-2 leading-relaxed">{q.question}</h3>
      <p className="text-center text-sm text-gray-400 mb-6">가장 나다운 것 1개 + 가장 아닌 것 1개</p>
      <div className="space-y-3 mb-6">
        {options.map((opt:any) => {
          const isF = first === opt.key;
          const isL = last === opt.key;
          return (
            <div key={opt.key} className={`border-2 rounded-xl p-4 transition-all ${isF ? 'border-green-500 bg-green-50' : isL ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
              <p className="text-sm mb-3">{opt.text}</p>
              <div className="flex gap-2">
                <button onClick={() => { if (last===opt.key) onLast(null); onFirst(isF?null:opt.key); }}
                  className={`text-xs px-3 py-1 rounded-full font-bold ${isF ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  ✓ 가장 나다움
                </button>
                <button onClick={() => { if (first===opt.key) onFirst(null); onLast(isL?null:opt.key); }}
                  className={`text-xs px-3 py-1 rounded-full font-bold ${isL ? 'bg-red-400 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  ✗ 가장 아님
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={handleSubmit} disabled={!first||!last}
        className={`w-full py-4 rounded-2xl text-lg font-bold ${first&&last ? 'text-white' : 'bg-gray-100 text-gray-300'}`}
        style={first&&last ? { background: color } : {}}>
        {isLast ? '완료' : '다음'}
      </button>
    </div>
  );
}

function SingleChoiceUI({ q, idx, total, options, selected, onSelect, onSubmit, color }: any) {
  return (
    <div>
      <div className="text-center text-xs text-gray-400 mb-2">{idx+1} / {total}</div>
      <p className="text-center text-sm text-gray-500 mb-4">가장 나다운 것 1개를 골라주세요</p>
      <h3 className="text-lg font-bold text-center mb-6 leading-relaxed">{q.question}</h3>
      <div className="space-y-3 mb-6">
        {options.map((opt:any) => (
          <button key={opt.key} onClick={() => onSelect(opt.key)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selected===opt.key ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
            <p className="text-sm">{opt.text}</p>
          </button>
        ))}
      </div>
      <button onClick={onSubmit} disabled={!selected}
        className={`w-full py-4 rounded-2xl text-lg font-bold ${selected ? 'text-white' : 'bg-gray-100 text-gray-300'}`}
        style={selected ? { background: color } : {}}>
        다음
      </button>
    </div>
  );
}
