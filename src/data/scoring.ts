// FACE Career Diagnosis — Scoring Engine (TypeScript)

import type {
  FocusCode, FocusScores, FocusResult, AnchorKey, AnchorScores,
  EnergyResult, EnergyLevel, EnergyStage, NadaumResult, NadaumLevel,
  JobFitResult, JobFitDetail, CategoryMatch, RankingAnswer, CapacityRankingAnswer,
} from './types';
import { FOCUS_TYPE_COMPETENCIES, COMP_NAMES, JOB_COMPETENCY_MAPPING, COMPANY_CATEGORIES } from './mappings';
import { capacityQuestions } from './questions';

// ─── Focus 점수 ───
export function calcFitScores(answers: RankingAnswer[]): FocusScores {
  const scores: FocusScores = { Em: 0, Cr: 0, Op: 0, Ar: 0 };
  const codes: FocusCode[] = ['Em', 'Cr', 'Op', 'Ar'];

  answers.forEach(a => {
    // 1위(first) = 4점, 4위(last) = 1점, 나머지 2개 = 각 3점, 2점 (중간)
    codes.forEach(code => {
      if (code === a.first) scores[code] += 4;
      else if (code === a.last) scores[code] += 1;
      else scores[code] += 2.5; // 중간 2개는 동일 점수
    });
  });

  return scores;
}

export function determineFitType(scores: FocusScores): FocusResult {
  const sorted = (Object.entries(scores) as [FocusCode, number][])
    .sort((a, b) => b[1] - a[1]);

  const needsRefine = Math.abs(sorted[0][1] - sorted[1][1]) <= 3;

  return {
    primary: sorted[0][0],
    secondary: sorted[1][0],
    tertiary: sorted[2][0],
    inferior: sorted[3][0],
    scores,
    subTypeCode: sorted[0][0] + sorted[1][0],
    needsRefine,
  };
}

export function applyRefine(scores: FocusScores, refineAnswers: FocusCode[]): { primary: FocusCode; secondary: FocusCode } {
  const counts: Record<FocusCode, number> = { Em: 0, Cr: 0, Op: 0, Ar: 0 };
  refineAnswers.forEach(a => { counts[a]++; });

  const sorted = (Object.entries(scores) as [FocusCode, number][])
    .sort((a, b) => b[1] - a[1]);
  const top2: [FocusCode, FocusCode] = [sorted[0][0], sorted[1][0]];

  if (counts[top2[1]] > counts[top2[0]]) {
    return { primary: top2[1], secondary: top2[0] };
  }
  return { primary: top2[0], secondary: top2[1] };
}

// ─── Anchor 점수 ───
export function calcAnchorScores(likertAnswers: Record<AnchorKey, number>, tradeoffWinners: AnchorKey[]): AnchorScores {
  const scores: AnchorScores = { mastery: 0, growth: 0, autonomy: 0, stability: 0, purpose: 0, balance: 0 };

  // Part 1: 리커트 (1~7)
  (Object.entries(likertAnswers) as [AnchorKey, number][]).forEach(([anchor, score]) => {
    scores[anchor] += score;
  });

  // Part 2: 강제선택 (winner +2)
  tradeoffWinners.forEach(winner => {
    scores[winner] += 2;
  });

  return scores;
}

export function getTopAnchors(scores: AnchorScores, n = 2): { anchor: AnchorKey; score: number }[] {
  return (Object.entries(scores) as [AnchorKey, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([anchor, score]) => ({ anchor, score }));
}

// ─── Interest 점수 ───
export function calcInterestScores(answers: RankingAnswer[]): Record<string, number> {
  const scores: Record<string, number> = {};
  // answers는 관심영역 랭킹 응답
  // 간소화: first=4점, last=1점, 나머지 2.5점
  answers.forEach(a => {
    scores[a.first] = (scores[a.first] || 0) + 4;
    scores[a.last] = (scores[a.last] || 0) + 1;
  });
  return scores;
}

// ─── Capacity 점수 ───
export function calcCapacityScores(answers: CapacityRankingAnswer[]): { raw: Record<string, number>; scaled: Record<string, number> } {
  const raw: Record<string, number> = {};

  answers.forEach((a, i) => {
    // first = 4점, last = 1점
    raw[a.first] = (raw[a.first] || 0) + 4;
    raw[a.last] = (raw[a.last] || 0) + 1;

    // 나머지 2개 = 각 2.5점 (질문 데이터에서 전체 옵션 코드 참조)
    const q = capacityQuestions[i] as any;
    if (q?.options) {
      const allCodes: string[] = q.options.map((o: any) => o.code);
      allCodes.forEach((code: string) => {
        if (code !== a.first && code !== a.last) {
          raw[code] = (raw[code] || 0) + 2.5;
        }
      });
    }
  });

  // 환산: raw → 0~100 (정규화)
  // 각 역량은 약 3회 출현, 원점수 범위 3~12
  const scaled: Record<string, number> = {};
  Object.entries(raw).forEach(([code, score]) => {
    const normalized = Math.min(100, Math.max(0, Math.round((score / 12) * 100)));
    scaled[code] = normalized;
  });

  return { raw, scaled };
}

// ─── Energy 점수 ───
export function calcEnergyScores(answers: number[]): EnergyResult {
  const adjusted = [...answers];
  // E-11(index 10)은 역채점
  if (adjusted.length > 10) {
    adjusted[10] = 8 - adjusted[10];
  }

  const motivation = adjusted.slice(0, 6);
  const engagement = adjusted.slice(6, 11);
  const action = adjusted.slice(11, 16);

  const motivPct = Math.round(motivation.reduce((s, v) => s + v, 0) / 6 / 7 * 100);
  const engagementPct = Math.round(engagement.reduce((s, v) => s + v, 0) / 5 / 7 * 100);
  const actionPct = Math.round(action.reduce((s, v) => s + v, 0) / 5 / 7 * 100);

  let motivLevel: string;
  if (motivPct >= 70) motivLevel = '충족';
  else if (motivPct >= 40) motivLevel = '부분충족';
  else motivLevel = '미충족';

  let actionLevel: string;
  if (actionPct >= 50) actionLevel = '높음';
  else if (actionPct >= 30) actionLevel = '보통';
  else actionLevel = '낮음';

  const stageMatrix: Record<string, EnergyStage> = {
    '충족_높음': '성장활성기', '충족_보통': '균형조율기', '충족_낮음': '잠재축적기',
    '부분충족_높음': '전환가속기', '부분충족_보통': '탐색진행기', '부분충족_낮음': '방향설정기',
    '미충족_높음': '돌파시도기', '미충족_보통': '에너지충전기', '미충족_낮음': '기반구축기',
  };
  const stage = stageMatrix[`${motivLevel}_${actionLevel}`];

  const greenStages: EnergyStage[] = ['성장활성기', '균형조율기', '전환가속기'];
  const redStages: EnergyStage[] = ['방향설정기', '에너지충전기', '기반구축기'];
  let energyLevel: EnergyLevel = 'yellow';
  if (greenStages.includes(stage)) energyLevel = 'green';
  if (redStages.includes(stage)) energyLevel = 'red';

  return { motivPct, actionPct, engagementPct, motivLevel, actionLevel, stage, energyLevel };
}

// ─── 나다움 판정 (주기능=나다움, 부기능=반나다움) ───
export function calcNadaumLevel(competencyCode: string, focusPrimary: string, focusSecondary?: string): NadaumResult {
  const primaryComps = FOCUS_TYPE_COMPETENCIES[focusPrimary as keyof typeof FOCUS_TYPE_COMPETENCIES] || [];
  if (primaryComps.includes(competencyCode)) {
    return { level: 'nadaum', label: '나다움', emoji: '🟢', desc: '자연스럽게 집중하는 역량' };
  }

  if (focusSecondary) {
    const secondaryComps = FOCUS_TYPE_COMPETENCIES[focusSecondary as keyof typeof FOCUS_TYPE_COMPETENCIES] || [];
    if (secondaryComps.includes(competencyCode)) {
      return { level: 'half_nadaum', label: '확장 나다움', emoji: '🟡', desc: '부기능에서 확장된 자연스러운 역량' };
    }
  }

  return { level: 'non_nadaum', label: '非나다움', emoji: '🔴', desc: '의식적 노력이 필요한 역량' };
}

// ─── 직무 적합도 (순수 점수, 보정 없음) ───
export function calcJobFit(
  scaledScores: Record<string, number>,
  primaryType: string,
  jobComps: string[],
  secondaryType?: string
): JobFitResult {
  const WEIGHTS = [1.3, 1.3, 1.1, 1.1, 1.0, 1.0, 0.8, 0.8];
  const details: JobFitDetail[] = [];
  let weightedSum = 0;
  let weightSum = 0;
  let nadaumCount = 0;
  let totalJudgeable = 0;

  jobComps.forEach((code, i) => {
    const rawScore = scaledScores[code] || 25;
    const isFoundation = code === 'Fd1' || code === 'Fd2';
    const weight = WEIGHTS[i] || 0.8;
    const nadaum = calcNadaumLevel(code, primaryType, secondaryType);

    weightedSum += rawScore * weight;
    weightSum += weight;

    if (!isFoundation) {
      totalJudgeable++;
      if (nadaum.level === 'nadaum') nadaumCount++;
      else if (nadaum.level === 'half_nadaum') nadaumCount += 0.5;
    }

    details.push({
      code,
      name: COMP_NAMES[code] || code,
      rawScore,
      isFoundation,
      weight,
      nadaum: nadaum.level,
      nadaumLabel: nadaum.label,
      nadaumEmoji: nadaum.emoji,
    });
  });

  const pct = Math.round(weightedSum / weightSum);
  const nadaumPct = totalJudgeable > 0 ? Math.round(nadaumCount / totalJudgeable * 100) : 0;

  let quadrant;
  if (pct >= 60 && nadaumPct >= 60) quadrant = { code: 'sweet_spot', label: '🟢 Sweet Spot', desc: '자연스럽고 잘하는 직무' };
  else if (pct >= 60 && nadaumPct < 60) quadrant = { code: 'acquired_str', label: '🟡 후천적 강점', desc: '잘하지만 에너지 소모가 큰 직무' };
  else if (pct < 60 && nadaumPct >= 60) quadrant = { code: 'potential', label: '🔵 잠재력', desc: '나답지만 아직 개발이 필요한 직무' };
  else quadrant = { code: 'not_fit', label: '🔴 비추천', desc: '맞지 않는 직무' };

  let level;
  if (pct >= 80) level = '매우 높음';
  else if (pct >= 65) level = '높음';
  else if (pct >= 50) level = '보통';
  else if (pct >= 35) level = '낮음';
  else level = '매우 낮음';

  return { pct, nadaumPct, level, quadrant, details };
}

// ─── 조직 카테고리 매칭 ───
export function calcCategoryMatch(anchorScores: AnchorScores): CategoryMatch[] {
  const maxScore = Math.max(...Object.values(anchorScores));
  const minScore = Math.min(...Object.values(anchorScores));
  const range = maxScore - minScore || 1;

  const userVec: Record<string, number> = {};
  (Object.entries(anchorScores) as [AnchorKey, number][]).forEach(([k, v]) => {
    userVec[k] = Math.round((v - minScore) / range * 100);
  });

  const results = Object.entries(COMPANY_CATEGORIES).map(([catKey, cat]) => {
    const catVec = cat.anchorProfile;
    let dotProduct = 0, normA = 0, normB = 0;
    Object.keys(userVec).forEach(k => {
      dotProduct += userVec[k] * (catVec as any)[k];
      normA += userVec[k] ** 2;
      normB += ((catVec as any)[k]) ** 2;
    });
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
    return { category: catKey, korean: cat.korean, similarity: Math.round(similarity * 100) };
  });

  return results.sort((a, b) => b.similarity - a.similarity);
}

// ─── 전체 진단 결과 계산 ───
export function calculateAll(
  energyAnswers: number[],
  focusAnswers: RankingAnswer[],
  anchorLikert: Record<AnchorKey, number>,
  anchorTradeoff: AnchorKey[],
  capacityAnswers: CapacityRankingAnswer[],
  focusRefine?: FocusCode[],
) {
  // 1. Energy
  const energy = calcEnergyScores(energyAnswers);

  // 2. Focus
  const focusScores = calcFitScores(focusAnswers);
  let focusResult = determineFitType(focusScores);
  if (focusResult.needsRefine && focusRefine && focusRefine.length > 0) {
    const refined = applyRefine(focusScores, focusRefine);
    focusResult = { ...focusResult, primary: refined.primary, secondary: refined.secondary, subTypeCode: refined.primary + refined.secondary };
  }

  // 3. Anchor
  const anchorScores = calcAnchorScores(anchorLikert, anchorTradeoff);
  const top2Anchors = getTopAnchors(anchorScores);

  // 4. Capacity
  const { raw, scaled } = calcCapacityScores(capacityAnswers);

  // 5. Job Fits (47개 직무)
  const jobFits = JOB_COMPETENCY_MAPPING.map(j => ({
    job: j.job,
    category: j.category,
    result: calcJobFit(scaled, focusResult.primary, j.comps, focusResult.secondary),
  })).sort((a, b) => b.result.pct - a.result.pct);

  // 6. Category Match
  const categoryMatches = calcCategoryMatch(anchorScores);

  return {
    focus: focusResult,
    anchor: { scores: anchorScores, top2: [top2Anchors[0].anchor, top2Anchors[1].anchor] as [AnchorKey, AnchorKey] },
    capacity: { raw, scaled },
    energy,
    jobFits,
    categoryMatches,
  };
}
