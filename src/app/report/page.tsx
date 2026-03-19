'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FOCUS_TYPES, ANCHOR_DEFS, COMP_NAMES } from '@/data/mappings';
import {
  calcFitScores, determineFitType, applyRefine,
  calcAnchorScores, getTopAnchors,
  calcCapacityScores, calcEnergyScores, calcInterestScores,
  calcJobFit, calcCategoryMatch, calcNadaumLevel,
} from '@/data/scoring';
import { JOB_COMPETENCY_MAPPING } from '@/data/mappings';
import { anchorLikertQuestions } from '@/data/questions';
import {
  FOCUS_INTERPRETATIONS, SUBTYPE_INTERPRETATIONS,
  ANCHOR_INTERPRETATIONS, ANCHOR_COMBO_INTERPRETATIONS,
  FOCUS_ANCHOR_NARRATIVES, ENERGY_STAGE_INTERPRETATIONS,
  ACTION_PLANS, ORG_TYPE_INTERPRETATIONS,
  getCompetencyInterpretation, generateSummary,
} from '@/data/interpretations';

const CODE_TO_TYPE: Record<string, string> = { Em: 'Empathy', Cr: 'Creative', Op: 'Operative', Ar: 'Architect' };
const TYPE_TO_CODE: Record<string, string> = { Empathy: 'Em', Creative: 'Cr', Operative: 'Op', Architect: 'Ar' };
const CODE_TO_EN: Record<string, string> = { Em: 'Connector', Cr: 'Creator', Op: 'Supporter', Ar: 'Architect' };

function computeAll(data?: any) {
  if (!data) {
    const raw = localStorage.getItem('face_diagnosis');
    if (!raw) return null;
    data = JSON.parse(raw);
  }

  const energy = calcEnergyScores(data.energy || []);
  const focusScores = calcFitScores(data.focus || []);
  let focus = determineFitType(focusScores);
  if (focus.needsRefine && data.focusRefine?.length) {
    const refined = applyRefine(focusScores, data.focusRefine);
    focus = { ...focus, ...refined, subTypeCode: refined.primary + refined.secondary };
  }

  const likertObj: Record<string, number> = {};
  anchorLikertQuestions.forEach((q: any, i: number) => {
    likertObj[q.anchor] = data.anchorLikert?.[i] || 4;
  });
  const anchorScores = calcAnchorScores(likertObj as any, data.anchorTradeoff || []);
  const top2 = getTopAnchors(anchorScores, 2);
  const { scaled } = calcCapacityScores(data.capacity || []);

  const focusTypeName = CODE_TO_TYPE[focus.primary] || focus.primary;
  const focusSecondaryName = CODE_TO_TYPE[focus.secondary] || focus.secondary;

  const allCodes = Object.keys(COMP_NAMES).filter(c => c !== 'Fd1' && c !== 'Fd2');
  const allScored = allCodes.map(c => ({
    code: c, name: COMP_NAMES[c], score: scaled[c] || 25,
    nadaum: calcNadaumLevel(c, focusTypeName, focusSecondaryName),
  })).sort((a, b) => b.score - a.score);

  const jobFits = JOB_COMPETENCY_MAPPING.map(j => ({
    job: j.job, category: j.category,
    ...calcJobFit(scaled, focusTypeName, j.comps, focusSecondaryName),
  })).sort((a, b) => b.pct - a.pct);

  const catMatches = calcCategoryMatch(anchorScores);

  // 관심영역 점수
  const interestScores = calcInterestScores(data.anchorInterest || []);
  const interestSorted = Object.entries(interestScores).sort((a, b) => b[1] - a[1]);

  return {
    focus, energy, anchorScores, top2, scaled,
    allScored, jobFits, catMatches,
    focusTypeName, focusSecondaryName,
    interestSorted,
    userName: data.userName || '회원',
    desiredJob: data.desiredJob || null,
  };
}

function buildAcquiredAnalysisPage(jobFits: any[], r: any, coreJobs: any[], compNames: any, calcNadaum: any, jobMapping: any[]): string {
  const acquiredTop3 = jobFits.filter((j: any) => j.quadrant.code === 'acquired_str').slice(0, 3);
  if (acquiredTop3.length === 0) return '';

  const cards = acquiredTop3.map((job: any) => {
    const mapping = jobMapping.find((j: any) => j.job === job.job);
    if (!mapping) return '';

    const compsAnalysis = mapping.comps
      .filter((code: string) => code !== 'Fd1' && code !== 'Fd2')
      .map((code: string) => ({
        code, name: compNames[code] || code,
        score: r.scaled[code] || 25,
        nadaum: calcNadaum(code, r.focusTypeName, r.focusSecondaryName),
      }));

    const nonNadaum = compsAnalysis.filter((c: any) => c.nadaum.level === 'non_nadaum').sort((a: any, b: any) => a.score - b.score);
    const nadaum = compsAnalysis.filter((c: any) => c.nadaum.level === 'nadaum' || c.nadaum.level === 'half_nadaum');
    const drainNames = nonNadaum.slice(0, 2).map((c: any) => c.name).join(', ');

    return '<div class="card mb-sm" style="border-left:5px solid #EAB308; background:#FFFBEB; padding:16px 20px;">'
      + '<div class="flex justify-between items-center mb-sm">'
      + '<div><span class="t-h4">' + job.job + '</span> <span class="tag tag-warn" style="font-size:8pt; margin-left:6px;">🟡 후천적 강점 ' + job.pct + '%</span></div>'
      + '<div class="t-small">나다움 ' + job.nadaumPct + '%</div>'
      + '</div>'
      + '<div class="grid-2 gap-sm">'
      + '<div><div style="font-size:10pt; font-weight:700; color:#166534; margin-bottom:4px;">자연스러운 역량</div>'
      + nadaum.map((c: any) => '<div style="font-size:10pt; color:#166534; margin-bottom:2px;">' + c.nadaum.emoji + ' ' + c.name + ' <strong>' + c.score + '</strong></div>').join('')
      + '</div>'
      + '<div><div style="font-size:10pt; font-weight:700; color:#991B1B; margin-bottom:4px;">에너지 소모 역량</div>'
      + nonNadaum.slice(0, 4).map((c: any) => '<div style="font-size:10pt; color:#991B1B; margin-bottom:2px;">🔴 ' + c.name + ' <strong>' + c.score + '</strong></div>').join('')
      + '</div></div>'
      + '<div class="mt-sm t-small" style="color:#92400E;">→ ' + (drainNames ? drainNames + ' 때문에 에너지가 더 들 수 있습니다. 잘할 수 있지만 장기적 소진에 주의하세요.' : '에너지 배분에 주의하세요.') + '</div>'
      + '</div>';
  }).join('\n  ');

  return '\n<div class="page" style="padding-top:22mm;">'
    + '\n  <div class="pg-head"><span class="fc-su" style="font-weight:700;">C</span><span>후천적 강점 분석</span></div>'
    + '\n  <div class="t-h2 mb-xs">후천적 강점 분석</div>'
    + '\n  <div class="t-body mb-md">점수는 높지만 나다움 비율이 낮은 직무입니다. "왜 잘하는데 힘들지?"의 답이 여기 있습니다. 어떤 역량이 에너지를 소모하는지 확인하세요.</div>'
    + '\n  ' + cards
    + '\n  <div class="card" style="background:#FFFBEB; border:1.5px solid #FDE68A; margin-top:8px;">'
    + '\n    <div class="t-body text-center" style="font-size:11pt; color:#92400E;">'
    + '\n      <strong>후천적 강점 직무는 단기 성과에는 유리하지만, 장기적으로는 Sweet Spot 직무를 중심에 두세요.</strong><br>'
    + '\n      에너지 소모 역량을 파악해두면, 번아웃을 미리 예방할 수 있습니다.'
    + '\n    </div>'
    + '\n  </div>'
    + '\n  <div class="pg-foot"><span>FACE Career Report</span><span></span></div>'
    + '\n</div>';
}

function replaceTemplate(html: string, r: any): string {
  const { focus, energy, anchorScores, top2, allScored, jobFits, catMatches, focusTypeName, focusSecondaryName } = r;

  const pt = (FOCUS_TYPES as any)[focusTypeName];
  const st = (FOCUS_TYPES as any)[focusSecondaryName];
  const a1 = (ANCHOR_DEFS as any)[top2[0].anchor];
  const a2 = (ANCHOR_DEFS as any)[top2[1].anchor];

  const quadrantPriority: Record<string, number> = { sweet_spot: 0, potential: 1, acquired_str: 2, not_fit: 3 };
  const coreJobs = [...jobFits].sort((a: any, b: any) => {
    const pa = quadrantPriority[a.quadrant.code] ?? 3;
    const pb = quadrantPriority[b.quadrant.code] ?? 3;
    if (pa !== pb) return pa - pb;
    return b.pct - a.pct;
  }).slice(0, 3);
  const top5 = allScored.slice(0, 5);
  const bottom3 = [...allScored].sort((a: any, b: any) => a.score - b.score).slice(0, 3);
  const nadaumList = allScored.filter((c: any) => c.nadaum.level === 'nadaum');
  const halfNadaumList = allScored.filter((c: any) => c.nadaum.level === 'half_nadaum');

  // Focus interpretation
  const focusScore = focus.scores[focus.primary];
  const focusLevel = focusScore >= 58 ? 'high' : focusScore >= 45 ? 'mid' : 'low';
  const focusInterp = (FOCUS_INTERPRETATIONS as any)[focusTypeName]?.[focusLevel];

  // Subtype
  const subtypeKey = focusTypeName.charAt(0) + focusTypeName.charAt(focusTypeName.length > 3 ? 0 : 0); // need proper key
  const stKey = `${focusTypeName}_${focusSecondaryName}`;
  const subtypeInterp = (SUBTYPE_INTERPRETATIONS as any)[stKey];

  // Anchor interpretation
  const anchor1Interp = (ANCHOR_INTERPRETATIONS as any)[top2[0].anchor];
  const anchor2Interp = (ANCHOR_INTERPRETATIONS as any)[top2[1].anchor];

  // Energy
  const energyEmoji = energy.energyLevel === 'green' ? '🟢' : energy.energyLevel === 'yellow' ? '🟡' : '🔴';
  const energyLabel = energy.energyLevel === 'green' ? '도전 가능' : energy.energyLevel === 'yellow' ? '탐색 단계' : '회복 우선';
  const energyBg = energy.energyLevel === 'green' ? '#DCFCE7' : energy.energyLevel === 'yellow' ? '#FEF9C3' : '#FEE2E2';
  const energyFg = energy.energyLevel === 'green' ? '#166534' : energy.energyLevel === 'yellow' ? '#854D0E' : '#991B1B';

  const anchorSorted = (Object.entries(anchorScores) as [string, number][]).sort((a, b) => b[1] - a[1]);
  const maxAnchor = Math.max(...Object.values(anchorScores as Record<string, number>));

  // Organization match
  const topOrg = catMatches[0];
  const topOrgName = catMatches[0]?.korean || '스타트업';

  const userName = r.userName || '회원';
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  let h = html;

  // ─── Capacity bars for At a Glance ───
  const capBarsHtml = top5.slice(0, 3).map((c: any) => {
    const color = c.score >= 70 ? 'var(--co)' : c.score >= 50 ? '#86EFAC' : 'var(--warn)';
    return `<div class="bar" style="margin-bottom:6px;"><div class="bar-top"><span class="bar-name" style="font-size:10pt;">${c.name}</span><span class="bar-score" style="font-size:10pt; color:${color};">${c.score}</span></div><div class="bar-track" style="height:7px;"><div class="bar-fill" style="width:${c.score}%; background:${color}; border-radius:4px;"></div></div></div>`;
  }).join('\n');
  const growthBarsHtml = bottom3.slice(0, 2).map((c: any) => {
    return `<div class="bar" style="margin-bottom:6px;"><div class="bar-top"><span class="bar-name" style="font-size:10pt; color:#94A3B8;">${c.name}</span><span class="bar-score" style="font-size:10pt; color:var(--bad);">${c.score}</span></div><div class="bar-track" style="height:7px;"><div class="bar-fill" style="width:${c.score}%; background:var(--bad); border-radius:4px;"></div></div></div>`;
  }).join('\n');

  // ─── Interest tags for Anchor card ───
  const interestTagsHtml = (r.interestSorted?.slice(0, 2) || []).map(([key]: [string, number]) => {
    const labels: Record<string, string> = { tech: '기술·혁신', business: '비즈니스', social: '사회·공공', creative: '창작·콘텐츠', health: '건강·웰빙', org: '조직·경영', education: '교육·성장', green: '환경·지속가능' };
    return `<span class="tag tag-cr">${labels[key] || key}</span>`;
  }).join('') || '<span class="tag tag-cr">기술·혁신</span>';

  // ─── Score bg helper ───
  const scoreBg = (pct: number) => pct >= 70 ? 'var(--good)' : pct >= 50 ? '#86EFAC' : 'var(--warn)';

  // ─── TOKEN REPLACEMENTS ───
  // Basic
  h = h.replaceAll('{{USER_NAME}}', userName);
  h = h.replaceAll('{{DIAGNOSIS_DATE}}', today);

  // At a Glance summary
  h = h.replaceAll('{{GLANCE_FOCUS_DESC}}', pt?.desc || '나다운 방식으로 일하는');
  h = h.replaceAll('{{GLANCE_ANCHOR_DESC}}', `${a1?.korean}과 ${a2?.korean}을 중시하는`);
  h = h.replaceAll('{{GLANCE_TOP_ORG_JOB}}', `${topOrg?.korean || '스타트업'}의 ${coreJobs[0]?.job || '추천 직무'}`);

  // Focus card
  h = h.replaceAll('{{SUBTYPE_NAME}}', subtypeInterp?.title || `${st?.korean}의 감각을 가진 ${pt?.korean}`);
  h = h.replaceAll('{{FOCUS_PRIMARY_EN}}', CODE_TO_EN[focus.primary] || focusTypeName);
  h = h.replaceAll('{{FOCUS_SECONDARY_EN}}', CODE_TO_EN[focus.secondary] || focusSecondaryName);
  h = h.replaceAll('{{FOCUS_SHORT_DESC}}', `${pt?.desc}<br>${st?.desc} 감각이 더해진 사람`);

  // Anchor card
  h = h.replaceAll('{{ANCHOR_1_EMOJI}}', a1?.emoji || '');
  h = h.replaceAll('{{ANCHOR_1_KOREAN}}', a1?.korean || '');
  h = h.replaceAll('{{ANCHOR_2_EMOJI}}', a2?.emoji || '');
  h = h.replaceAll('{{ANCHOR_2_KOREAN}}', a2?.korean || '');
  h = h.replaceAll('{{ANCHOR_COMBO_SHORT}}', `${a1?.korean}과 ${a2?.korean}을<br>가장 중요하게 여깁니다`);
  h = h.replaceAll('{{ANCHOR_INTEREST_TAGS}}', interestTagsHtml);

  // Capacity bars (At a Glance)
  h = h.replace('<!-- CAP_BARS_PLACEHOLDER -->', capBarsHtml);
  h = h.replace('<!-- GROWTH_BARS_PLACEHOLDER -->', growthBarsHtml);

  // Energy card
  h = h.replaceAll('{{ENERGY_BADGE_BG}}', energyBg);
  h = h.replaceAll('{{ENERGY_BADGE_FG}}', energyFg);
  h = h.replaceAll('{{ENERGY_EMOJI}}', energyEmoji);
  h = h.replaceAll('{{ENERGY_LABEL}}', energyLabel);
  h = h.replaceAll('{{ENERGY_STAGE}}', energy.stage);
  h = h.replaceAll('{{ENERGY_SHORT_DESC}}', (ENERGY_STAGE_INTERPRETATIONS as any)[energy.stage]?.shortDesc || '현재 단계에 맞는 전략이 필요합니다.');

  // Core TOP 3 jobs
  h = h.replaceAll('{{CORE_JOB_1}}', coreJobs[0]?.job || '');
  h = h.replaceAll('{{CORE_JOB_1_SCORE}}', String(coreJobs[0]?.pct || ''));
  h = h.replaceAll('{{CORE_JOB_1_SCORE_BG}}', scoreBg(coreJobs[0]?.pct || 0));
  h = h.replaceAll('{{CORE_JOB_1_CAT}}', coreJobs[0]?.category || '');
  h = h.replaceAll('{{CORE_JOB_2}}', coreJobs[1]?.job || '');
  h = h.replaceAll('{{CORE_JOB_2_SCORE}}', String(coreJobs[1]?.pct || ''));
  h = h.replaceAll('{{CORE_JOB_2_SCORE_BG}}', scoreBg(coreJobs[1]?.pct || 0));
  h = h.replaceAll('{{CORE_JOB_2_CAT}}', coreJobs[1]?.category || '');
  h = h.replaceAll('{{CORE_JOB_3}}', coreJobs[2]?.job || '');
  h = h.replaceAll('{{CORE_JOB_3_SCORE}}', String(coreJobs[2]?.pct || ''));
  h = h.replaceAll('{{CORE_JOB_3_SCORE_BG}}', scoreBg(coreJobs[2]?.pct || 0));
  h = h.replaceAll('{{CORE_JOB_3_CAT}}', coreJobs[2]?.category || '');

  // Tags
  h = h.replaceAll('{{TOP_ORG_KOREAN}}', topOrg?.korean || '스타트업');

  // ─── Focus Result Page ───
  // Badge: primary type (it's a div, not span)
  h = h.replace(
    /background:var\(--co\); color:white; padding:8px 20px; border-radius:10px; font-weight:800; font-size:12pt;">교감형/,
    `background:${pt?.color}; color:white; padding:8px 20px; border-radius:10px; font-weight:800; font-size:12pt;">${pt?.korean}`
  );

  // 2×2 grid: completely replace with dynamic data
  const typeGrid = [
    { code: 'Em', bg: '#DCFCE7', borderColor: 'var(--co)', color: 'var(--co)', textColor: '#166534', axis: '사람 × 탐색에 집중' },
    { code: 'Cr', bg: '#FFF7ED', borderColor: 'var(--cr)', color: 'var(--cr)', textColor: '#9A3412', axis: '과업 × 탐색에 집중' },
    { code: 'Op', bg: '#EFF6FF', borderColor: 'var(--su)', color: 'var(--su)', textColor: '#1E40AF', axis: '사람 × 체계에 집중' },
    { code: 'Ar', bg: '#F5F3FF', borderColor: 'var(--ar)', color: 'var(--ar)', textColor: '#5B21B6', axis: '과업 × 체계에 집중' },
  ];
  const primaryCode = focus.primary; // e.g., 'Cr'
  const gridCells = typeGrid.map(t => {
    const isPrimary = t.code === primaryCode;
    const typeName = (FOCUS_TYPES as any)[CODE_TO_TYPE[t.code]]?.korean || t.code;
    const score = Math.round(focus.scores[t.code] || 0);
    return `<div class="rounded p-md" style="background:${t.bg};${isPrimary ? ` border:3px solid ${t.borderColor};` : ''}">
        <div style="font-weight:${isPrimary ? '800' : '700'}; color:${t.color}; font-size:13pt;">${isPrimary ? '● ' : ''}${typeName}</div>
        <div class="t-small" style="color:${t.textColor};">${t.axis}</div>
        <div style="font-size:24pt; font-weight:900; color:${t.color}; margin-top:4px;">${score}</div>
      </div>`;
  }).join('\n      ');

  // ─── Focus: 추가 토큰 교체 ───
  const primaryInfo = { code: focus.primary, type: pt, score: Math.round(focus.scores[focus.primary] || 0) };
  const secondaryInfo = { code: focus.secondary, type: st, score: Math.round(focus.scores[focus.secondary] || 0) };
  const focusSorted = (['Em','Cr','Op','Ar'] as const)
    .map(c => ({ code: c, type: (FOCUS_TYPES as any)[CODE_TO_TYPE[c]], score: Math.round(focus.scores[c] || 0) }))
    .sort((a, b) => b.score - a.score);
  const remaining = focusSorted.filter(f => f.code !== focus.primary && f.code !== focus.secondary);
  const f3 = remaining[0], f4 = remaining[1];

  h = h.replaceAll('{{FOCUS_PRIMARY_KOREAN}}', pt?.korean || focusTypeName);
  h = h.replaceAll('{{FOCUS_SECONDARY_KOREAN}}', st?.korean || focusSecondaryName);
  h = h.replaceAll('{{FOCUS_PRIMARY_SCORE}}', String(primaryInfo.score));
  h = h.replaceAll('{{FOCUS_SECONDARY_SCORE}}', String(secondaryInfo.score));
  h = h.replaceAll('{{SUBTYPE_CODE}}', focus.subTypeCode || `${focus.primary}${focus.secondary}`);

  // ─── Focus: 2x2 그리드 → 플레이스홀더 교체 ───
  h = h.replace('<!-- FOCUS_2X2_GRID_PLACEHOLDER -->', gridCells);

  // ─── Focus: 해석 텍스트 → 동적 생성 ───
  const scoreFirst = focusSorted[0];
  const wasRefined = focus.primary !== scoreFirst.code;
  const refineNote = wasRefined
    ? `<div class="card mt-sm" style="background:#FEF9C3; border:1.5px solid #FDE68A; padding:12px 16px;">
        <div class="t-body" style="font-size:10.5pt; color:#92400E; line-height:1.7;">
          💡 <strong>점수와 주기능이 다른 이유:</strong> 원점수는 ${scoreFirst.type?.korean}(${scoreFirst.score})이 근소하게 높지만,
          정제 질문에서 ${primaryInfo.type?.korean}을 더 자연스럽다고 선택하셨습니다.
          점수 차이가 작을 때(${scoreFirst.score} vs ${primaryInfo.score})는 정제 응답이 더 정확한 지표입니다.
        </div>
      </div>`
    : '';

  const focusInterpHtml = `
    <div class="t-body" style="font-size:11pt; line-height:1.9;">
      <strong style="color:${primaryInfo.type?.color};">주기능 ${primaryInfo.type?.korean}</strong>은 당신이 일할 때 가장 자연스럽게 에너지를 쏟는 방향입니다.
      의식하지 않아도 ${primaryInfo.type?.desc} 것에 먼저 집중하게 되며, 이 영역에서 가장 높은 성과와 만족을 경험합니다.<br><br>
      <strong style="color:${secondaryInfo.type?.color};">부기능 ${secondaryInfo.type?.korean}</strong>은 주기능을 보완하는 두 번째 집중 방식입니다.
      주기능만큼 자연스럽진 않지만, 상황에 따라 유연하게 활용할 수 있는 숨겨진 무기입니다.
      이 두 가지가 결합되어 당신만의 고유한 스타일을 만듭니다.<br><br>
      <span class="t-small">3위 ${f3?.type?.korean}(${f3?.score})과 4위 ${f4?.type?.korean}(${f4?.score})은 상대적으로 덜 사용하는 방식이지만, 필요할 때 의식적으로 활용할 수 있습니다.</span>
    </div>
    ${refineNote}`;
  h = h.replace('<!-- FOCUS_INTERP_PLACEHOLDER -->', focusInterpHtml);

  // ─── Focus: 세부유형 카드 → 동적 생성 ───
  const subtypeCard = `<div class="rounded-lg" style="background:${pt?.color}10; border:2px solid ${pt?.color}40; padding:16px 20px; display:flex; gap:16px; align-items:center;">
    <div style="flex-shrink:0; width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg, ${pt?.color}, ${pt?.color}dd); display:flex; align-items:center; justify-content:center; font-size:40pt;">${pt?.emoji || '✨'}</div>
    <div style="flex:1;">
      <div style="font-size:20pt; font-weight:900; color:${pt?.color};">${subtypeInterp?.title || `${st?.korean}의 감각을 가진 ${pt?.korean}`}</div>
      <div class="t-small mb-sm" style="color:${pt?.color};">${focus.subTypeCode || `${focus.primary}${focus.secondary}`} — ${CODE_TO_EN[focus.primary] || focusTypeName} × ${CODE_TO_EN[focus.secondary] || focusSecondaryName}</div>
      <div class="t-body" style="font-size:11pt;">${subtypeInterp?.description || `${pt?.desc} 감각과 ${st?.desc} 능력이 결합된 독특한 조합입니다.`}</div>
      <div class="mt-sm" style="font-size:11pt;">
        <strong style="color:${pt?.color};">강점</strong> — ${subtypeInterp?.strength || `${pt?.korean}의 핵심 강점이 빛나는 순간입니다.`}<br>
        <strong style="color:${st?.color};">주의</strong> — ${subtypeInterp?.caution || '에너지 분배에 주의가 필요합니다.'}
      </div>
    </div>
  </div>`;
  h = h.replace('<!-- SUBTYPE_CARD_PLACEHOLDER -->', subtypeCard);

  // ─── Focus: 빛과 그림자 페이지 ───
  const focusLSData = (FOCUS_INTERPRETATIONS as any)[focusTypeName];
  const lightItems: string[] = focusLSData?.light || [];
  const shadowItems: string[] = focusLSData?.shadow || [];
  const lightCards = lightItems.map((text: string) =>
    `<div class="card mb-sm" style="border-left:4px solid ${pt?.color};">
      <div class="t-body">${text}</div>
    </div>`
  ).join('');
  const shadowCards = shadowItems.map((text: string) =>
    `<div class="card mb-sm" style="border-left:4px solid #CBD5E1;">
      <div class="t-body">${text}</div>
    </div>`
  ).join('');
  const lightShadowPage = `<div class="page" style="padding-top:22mm;">
  <div class="pg-head"><span style="color:${pt?.color}; font-weight:700;">Part 2</span><span>나는 누구인가 — 빛과 그림자</span></div>

  <div class="t-h2 mb-xs">빛과 그림자</div>
  <div class="t-body mb-md" style="font-size:11pt; color:var(--sub);">
    모든 강점에는 그림자가 있습니다. 빛은 당신의 유형이 자연스럽게 발휘되는 모습이고, 그림자는 그 강점이 과해지거나 스트레스 상황에서 나타나는 이면입니다. 그림자를 아는 것이 성장의 시작입니다.
  </div>

  <div class="grid-2 gap-lg mb-md">
    <div>
      <div class="t-h4 mb-sm" style="color:${pt?.color};">☀️ 빛 — 당신이 빛나는 순간</div>
      ${lightCards}
    </div>
    <div>
      <div class="t-h4 mb-sm" style="color:#64748B;">🌙 그림자 — 강점이 과해질 때</div>
      ${shadowCards}
    </div>
  </div>

  <div class="grid-2 gap-md">
    <div class="rounded-lg p-md" style="background:#F0FDF4;">
      <div class="t-h4 mb-xs" style="color:${pt?.color};">⚡ 에너지원</div>
      <div class="t-body">${focusLSData?.energy || ''}</div>
    </div>
    <div class="rounded-lg p-md" style="background:#FFFBEB;">
      <div class="t-h4 mb-xs" style="color:#B45309;">🔋 번아웃 시그널</div>
      <div class="t-body">${focusLSData?.burnout || ''}</div>
    </div>
  </div>

  <div class="grid-2 gap-md mt-md">
    <div class="card-outline" style="border:2px solid ${pt?.color};">
      <div class="t-h4 mb-xs" style="color:${pt?.color};">✅ 이런 환경에서 빛납니다</div>
      <div class="t-body">${focusLSData?.idealEnv || ''}</div>
    </div>
    <div class="card-outline" style="border:2px solid var(--bad);">
      <div class="t-h4 mb-xs" style="color:var(--bad);">⚠️ 이런 환경은 피하세요</div>
      <div class="t-body">${focusLSData?.riskEnv || ''}</div>
    </div>
  </div>

  <div class="pg-foot"><span>FACE Career Report</span><span>7</span></div>
</div>`;
  h = h.replace('<!-- LIGHT_SHADOW_PLACEHOLDER -->', lightShadowPage);

  // ─── F 파트 총정리 (다크) ───
  const fWrapCoreJobsHtml = coreJobs.slice(0, 3).map((j: any) => `
    <div style="background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); border-radius:12px; padding:14px 18px; flex:1;">
      <div style="font-size:9pt; font-weight:700; color:#86EFAC; letter-spacing:.5px; margin-bottom:4px;">${j.category || ''}</div>
      <div style="font-size:13pt; font-weight:800; color:white; margin-bottom:4px;">${j.job}</div>
      <div style="font-size:10pt; font-weight:700; color:#4ADE80;">${j.pct}%</div>
    </div>`).join('');

  const fWrapLightItems = (focusLSData?.light || []).slice(0, 3).map((l: string) =>
    `<div style="display:flex; align-items:flex-start; gap:10px; margin-bottom:10px;">
      <div style="width:6px; height:6px; border-radius:50%; background:#4ADE80; flex-shrink:0; margin-top:5px;"></div>
      <span style="font-size:10.5pt; color:#D1FAE5; line-height:1.65;">${l}</span>
    </div>`
  ).join('');

  const fWrapShadowItems = (focusLSData?.shadow || []).slice(0, 2).map((s: string) =>
    `<div style="display:flex; align-items:flex-start; gap:10px; margin-bottom:10px;">
      <div style="width:6px; height:6px; border-radius:50%; background:#FCA5A5; flex-shrink:0; margin-top:5px;"></div>
      <span style="font-size:10.5pt; color:#FECACA; line-height:1.65;">${s}</span>
    </div>`
  ).join('');

  const fWrapPage = `
<div class="page bg-dark" style="padding-top:20mm; position:relative; overflow:hidden;">
  <div style="font-size:72pt; font-weight:900; opacity:.06; position:absolute; top:20%; letter-spacing:8px; left:0; right:0; text-align:center; color:white;">FOCUS</div>

  <div class="pg-head"><span style="color:${pt?.color}; font-weight:700;">F</span><span style="color:#94A3B8;">Focus 총정리</span></div>

  <!-- 유형 배지 -->
  <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px;">
    <div style="width:52px; height:52px; border-radius:50%; background:${pt?.color}; display:flex; align-items:center; justify-content:center; font-size:22pt; font-weight:900; color:white; flex-shrink:0;">${pt?.korean?.charAt(0) || 'F'}</div>
    <div>
      <div style="font-size:11pt; color:#86EFAC; font-weight:700; letter-spacing:.5px; margin-bottom:2px;">주기능 ${pt?.korean} × 부기능 ${st?.korean}</div>
      <div style="font-size:20pt; font-weight:900; color:white; line-height:1.1;">${subtypeInterp?.title || `${st?.korean}의 감각을 가진 ${pt?.korean}`}</div>
    </div>
  </div>

  <!-- 핵심 한 줄 -->
  <div style="background:rgba(74,222,128,.12); border:1px solid rgba(74,222,128,.3); border-radius:12px; padding:14px 20px; margin-bottom:20px; font-size:11pt; color:#D1FAE5; line-height:1.8;">
    ${subtypeInterp?.desc || pt?.desc || '당신만의 집중 방식이 커리어의 방향을 결정합니다.'}
  </div>

  <!-- 빛 / 그림자 2열 -->
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px;">
    <div style="background:rgba(255,255,255,.05); border-radius:12px; padding:14px 16px;">
      <div style="font-size:10pt; font-weight:700; color:#4ADE80; margin-bottom:10px;">✦ 자연스러운 강점</div>
      ${fWrapLightItems || '<div style="font-size:10pt; color:#86EFAC;">데이터를 불러오는 중...</div>'}
    </div>
    <div style="background:rgba(255,255,255,.05); border-radius:12px; padding:14px 16px;">
      <div style="font-size:10pt; font-weight:700; color:#FCA5A5; margin-bottom:10px;">△ 주의할 그림자</div>
      ${fWrapShadowItems || '<div style="font-size:10pt; color:#FECACA;">데이터를 불러오는 중...</div>'}
    </div>
  </div>

  <!-- Core Fit 직무 -->
  <div style="margin-bottom:20px;">
    <div style="font-size:10pt; font-weight:700; color:#86EFAC; letter-spacing:.5px; margin-bottom:10px;">F 기반 Core Fit 직무</div>
    <div style="display:flex; gap:10px;">${fWrapCoreJobsHtml}</div>
  </div>

  <!-- 다음 섹션 연결 -->
  <div style="background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:14px 20px; display:flex; align-items:center; gap:14px;">
    <div style="width:40px; height:40px; border-radius:50%; background:rgba(249,115,22,.3); display:flex; align-items:center; justify-content:center; font-size:18pt; font-weight:900; color:#FDBA74; flex-shrink:0;">A</div>
    <div>
      <div style="font-size:9.5pt; color:#94A3B8; margin-bottom:2px;">다음 챕터</div>
      <div style="font-size:11pt; font-weight:700; color:white;">Anchor — 가치관이 방향을 결정합니다</div>
      <div style="font-size:9.5pt; color:#94A3B8; margin-top:2px;">같은 유형이라도 무엇을 중요하게 여기느냐에 따라 커리어가 달라집니다</div>
    </div>
  </div>

  <div class="pg-foot" style="border-color:rgba(255,255,255,.1);"><span style="color:#4ADE80;">FACE Career Report</span><span style="color:#4ADE80;"></span></div>
</div>`;
  h = h.replace('<!-- F_WRAP_PLACEHOLDER -->', fWrapPage);

  // ─── Focus 요약 페이지 ───
  const focusSummaryBars = focusSorted.map((f: any) => {
    const isPrimary = f.code === focus.primary;
    const isSecondary = f.code === focus.secondary;
    const barColor = isPrimary ? pt?.color : isSecondary ? (st?.color || '#94A3B8') : '#CBD5E1';
    const textColor = isPrimary ? pt?.color : isSecondary ? (st?.color || '#94A3B8') : '#94A3B8';
    const badge = isPrimary ? `<span style="font-size:8.5pt; font-weight:700; background:${pt?.color}; color:white; padding:2px 9px; border-radius:4px; margin-left:8px;">주기능</span>` : isSecondary ? `<span style="font-size:8.5pt; font-weight:700; background:${st?.color || '#94A3B8'}20; color:${st?.color || '#94A3B8'}; padding:2px 9px; border-radius:4px; border:1px solid ${st?.color || '#94A3B8'}40; margin-left:8px;">부기능</span>` : '';
    return `<div style="margin-bottom:22px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <div style="display:flex; align-items:center;">
          <span style="font-size:12pt; font-weight:${isPrimary ? '800' : '600'}; color:${textColor};">${f.type?.korean || f.code}</span>${badge}
        </div>
        <span style="font-size:15pt; font-weight:900; color:${textColor};">${f.score}</span>
      </div>
      <div style="height:14px; background:#F1F5F9; border-radius:7px; overflow:hidden;">
        <div style="height:100%; width:${f.score}%; background:${barColor}; border-radius:7px;"></div>
      </div>
      <div style="font-size:9.5pt; color:#94A3B8; margin-top:5px;">${f.type?.desc || ''}</div>
    </div>`;
  }).join('');

  const subtypeInterpForSummary = (FOCUS_INTERPRETATIONS as any)[focusTypeName];
  const focusSummaryKeywords: string[] = subtypeInterpForSummary?.keywords || pt?.keywords || [];
  const keywordTags = focusSummaryKeywords.slice(0, 6).map((kw: string) =>
    `<span style="display:inline-block; padding:4px 12px; border-radius:20px; background:${pt?.color}15; color:${pt?.color}; font-size:9.5pt; font-weight:700; margin:3px 3px 0 0;">${kw}</span>`
  ).join('');

  const focusSummaryPage = `
<div class="page" style="padding-top:20mm;">
  <div class="pg-head"><span class="fc-co" style="font-weight:700;">F</span><span>나는 누구인가 — Focus 결과</span></div>

  <div style="display:flex; align-items:stretch; gap:20px; margin-bottom:22px;">
    <!-- 왼쪽: 캐릭터 일러스트 자리 + 타입 배지 -->
    <div style="flex-shrink:0; width:185px; text-align:center; display:flex; flex-direction:column;">
      <div style="flex:1; min-height:280px; border-radius:16px; background:linear-gradient(160deg, ${pt?.color}20, ${pt?.color}40); border:2px dashed ${pt?.color}60; display:flex; flex-direction:column; align-items:center; justify-content:center; margin-bottom:12px;">
        <div style="font-size:8.5pt; font-weight:700; color:${pt?.color}; opacity:.6; letter-spacing:1px;">CHARACTER</div>
        <div style="font-size:8.5pt; font-weight:700; color:${pt?.color}; opacity:.6; letter-spacing:1px;">ILLUST</div>
      </div>
      <div style="background:${pt?.color}; color:white; border-radius:10px; padding:10px 14px; font-size:15pt; font-weight:900;">${pt?.korean || '교감형'}</div>
      <div style="font-size:9.5pt; color:#64748B; margin-top:6px;">${CODE_TO_EN[focus.primary] || ''}</div>
    </div>

    <!-- 오른쪽: 서브타입 + 키워드 + 설명 -->
    <div style="flex:1;">
      <div style="font-size:9pt; font-weight:700; color:${pt?.color}; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px;">FOCUS TYPE</div>
      <div style="font-size:22pt; font-weight:900; color:#0F172A; line-height:1.2; margin-bottom:8px;">${subtypeInterp?.title || `${st?.korean}의 감각을 가진 ${pt?.korean}`}</div>
      <div style="font-size:10.5pt; color:#475569; line-height:1.8; margin-bottom:14px;">${subtypeInterp?.desc || pt?.desc || ''}</div>
      <div style="margin-bottom:16px;">${keywordTags}</div>
      <div style="background:#F8FAFC; border-radius:10px; padding:12px 16px; font-size:10pt; color:#475569; line-height:1.7; border-left:3px solid ${pt?.color};">
        주기능 <strong style="color:${pt?.color};">${pt?.korean}(${primaryInfo.score})</strong> + 부기능 <strong style="color:${st?.color || '#64748B'};">${st?.korean}(${secondaryInfo.score})</strong>의 조합으로, 두 감각이 시너지를 이루는 <strong>${focus.subTypeCode || ''} ${subtypeInterp?.title || ''}</strong> 유형입니다.
      </div>
    </div>
  </div>

  <!-- 4유형 점수 바 차트 -->
  <div style="background:#F8FAFC; border-radius:14px; padding:22px 26px; margin-bottom:28px;">
    <div style="font-size:12pt; font-weight:700; color:#0F172A; margin-bottom:18px;">4가지 집중 방식 점수</div>
    ${focusSummaryBars}
  </div>

  <div class="pg-foot"><span>FACE Career Report</span><span></span></div>
</div>`;
  h = h.replace('<!-- FOCUS_SUMMARY_PLACEHOLDER -->', focusSummaryPage);

  // ─── Anchor: bubble chart + detail cards ───
  // 원점수 → 100점 만점 환산 (이론적 최대 = 리커트7 + 트레이드오프4 = 11)
  const ANCHOR_MAX = 11;
  const anchorAll = (Object.entries(anchorScores) as [string, number][])
    .map(([k, v]) => ({
      key: k,
      raw: v,
      score: Math.round((v / ANCHOR_MAX) * 100),
      def: (ANCHOR_DEFS as any)[k],
    }))
    .sort((a, b) => b.score - a.score);
  const maxAnchorScore = anchorAll[0].score || 1;

  // Bubble colors
  const bubbleColors: Record<string, string> = {
    mastery: '#8B5CF6', growth: '#F59E0B', autonomy: '#3B82F6',
    stability: '#94A3B8', purpose: '#22C55E', balance: '#EC4899',
  };
  // Bubble positions (pre-defined layout for 6 bubbles)
  const bubblePositions = [
    { left: 120, top: 45 },  // 1st
    { left: 260, top: 15 },  // 2nd
    { left: 300, top: 148 }, // 3rd
    { left: 30, top: 25 },   // 4th
    { left: 55, top: 165 },  // 5th
    { left: 190, top: 215 }, // 6th
  ];
  const bubbleSizes = [170, 145, 110, 92, 74, 48];
  const bubbleFontSizes = [
    { name: '26pt', score: '20pt', label: true },
    { name: '26pt', score: '17pt', label: true },
    { name: '18pt', score: '13pt', label: false },
    { name: '15pt', score: '11pt', label: false },
    { name: '13pt', score: '11.5pt', label: false },
    { name: '9pt', score: '8pt', label: false },
  ];

  let bubbleHtml = '';
  anchorAll.forEach((a, i) => {
    const pos = bubblePositions[i];
    const size = bubbleSizes[i];
    const fs = bubbleFontSizes[i];
    const labelTag = i === 0 ? '메인 가치' : i === 1 ? '서브 가치' : '';
    bubbleHtml += `<div style="position:absolute; left:${pos.left}px; top:${pos.top}px; width:${size}px; height:${size}px; border-radius:50%; background:${bubbleColors[a.key] || '#94A3B8'}; display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:${6 - i};">
      <div style="font-size:${fs.name}; font-weight:900; color:white; letter-spacing:-0.5px;">${a.def?.korean}</div>
      <div style="font-size:${fs.score}; font-weight:700; color:rgba(255,255,255,.7); line-height:1; margin-top:2px;">${a.score}</div>
      ${labelTag ? `<div style="font-size:7.5pt; font-weight:700; color:rgba(255,255,255,.8); background:rgba(255,255,255,.2); padding:2px 10px; border-radius:10px; margin-top:4px;">${labelTag}</div>` : ''}
    </div>\n`;
  });

  // ─── ANCHOR_BUBBLE_PLACEHOLDER ───
  h = h.replace('<!-- ANCHOR_BUBBLE_PLACEHOLDER -->', bubbleHtml);

  // Anchor detail cards (메인/서브) — 통째로 교체
  const anchorInterpData = (ANCHOR_INTERPRETATIONS as any);
  const a1Key = anchorAll[0].key;
  const a2Key = anchorAll[1].key;
  const a1I = anchorInterpData?.[a1Key];
  const a2I = anchorInterpData?.[a2Key];

  // Build main anchor card
  const mainAnchorCard = `<div class="rounded-lg p-lg" style="background:linear-gradient(160deg, #FFFBEB, #FEF3C7); border:2px solid #FDE68A;">
      <div class="text-center">
        <div style="font-size:28pt;">${anchorAll[0].def?.emoji}</div>
        <div class="t-label mt-xs" style="color:#B45309;">메인 가치</div>
        <div style="font-size:26pt; font-weight:900; color:#92400E; margin:4px 0;">${anchorAll[0].def?.korean}</div>
        <div class="t-small" style="color:#B45309;">${anchorAll[0].score}점</div>
      </div>
      <div style="height:1px; background:#FDE68A; margin:14px 0;"></div>
      <div class="t-body" style="font-size:11.5pt;">
        ${a1I?.highDesc || ''}<br><br>
        <strong style="color:#92400E;">맞는 환경:</strong> ${a1I?.orgFit || ''}<br><br>
        <strong style="color:#92400E;">조직 선택 질문:</strong> ${a1I?.question || ''}
      </div>
    </div>`;

  // Build sub anchor card
  const subAnchorCard = `<div class="rounded-lg p-lg" style="background:linear-gradient(160deg, #EFF6FF, #DBEAFE); border:2px solid #BFDBFE;">
      <div class="text-center">
        <div style="font-size:28pt;">${anchorAll[1].def?.emoji}</div>
        <div class="t-label mt-xs" style="color:#1D4ED8;">서브 가치</div>
        <div style="font-size:26pt; font-weight:900; color:#1E40AF; margin:4px 0;">${anchorAll[1].def?.korean}</div>
        <div class="t-small" style="color:#1D4ED8;">${anchorAll[1].score}점</div>
      </div>
      <div style="height:1px; background:#BFDBFE; margin:14px 0;"></div>
      <div class="t-body" style="font-size:11.5pt;">
        ${a2I?.highDesc || ''}<br><br>
        <strong style="color:#1E40AF;">맞는 환경:</strong> ${a2I?.orgFit || ''}<br><br>
        <strong style="color:#1E40AF;">조직 선택 질문:</strong> ${a2I?.question || ''}
      </div>
    </div>`;

  // Replace placeholder with dynamic cards
  h = h.replace(
    /<!-- ANCHOR_DETAIL_CARDS_PLACEHOLDER -->/,
    `<div class="grid-2 gap-md mb-md">\n    ${mainAnchorCard}\n    ${subAnchorCard}\n  </div>`
  );

  // Anchor combo quote
  const comboKey = `${a1Key}_${a2Key}`;
  const comboInterp = (ANCHOR_COMBO_INTERPRETATIONS as any)?.[comboKey];
  const comboText = comboInterp
    ? `<strong>${comboInterp.title}</strong><br>${comboInterp.desc}<br><br><em>방향: ${comboInterp.direction}</em>`
    : `${anchorAll[0].def?.korean} × ${anchorAll[1].def?.korean} 조합은 당신만의 고유한 커리어 나침반입니다.`;
  // ─── ANCHOR_COMBO_PLACEHOLDER ───
  h = h.replace('<!-- ANCHOR_COMBO_PLACEHOLDER -->', comboText);

  // ─── Anchor 6개 상세 카드 (lines 927-976) ───
  const anchorCardColors: Record<string, { bg: string; border: string; textDark: string; textLight: string }> = {
    growth:    { bg: '#FEF9C3', border: '#F59E0B', textDark: '#92400E', textLight: '#78350F' },
    autonomy:  { bg: '#DBEAFE', border: '#3B82F6', textDark: '#1E40AF', textLight: '#1E3A5F' },
    mastery:   { bg: '#EDE9FE', border: '#8B5CF6', textDark: '#5B21B6', textLight: '#4C1D95' },
    purpose:   { bg: '#DCFCE7', border: '#22C55E', textDark: '#166534', textLight: '#14532D' },
    balance:   { bg: '#FCE7F3', border: '#EC4899', textDark: '#9D174D', textLight: '#831843' },
    stability: { bg: '#F1F5F9', border: '#94A3B8', textDark: '#475569', textLight: '#64748B' },
  };
  const anchorDescriptions: Record<string, string> = {
    growth: '빠르게 성장하고 더 높은 곳에 가고 싶습니다. 도전이 곧 에너지입니다.',
    autonomy: '내 방식대로 일하는 것이 중요합니다. 자유 없이는 최고의 성과가 안 나옵니다.',
    mastery: '한 분야에서 깊이를 추구합니다. 전문가로 인정받는 것이 중요합니다.',
    purpose: '의미 있는 일을 하고 싶습니다. 사회에 기여하는 것에서 에너지를 얻습니다.',
    balance: '일과 삶의 균형을 중시합니다. 지속 가능한 삶의 방식을 추구합니다.',
    stability: '예측 가능한 환경과 안정적인 보상을 원합니다. 불확실성을 줄이고 싶습니다.',
  };

  // Build 6 anchor detail cards HTML
  let anchorCardsHtml = '';
  anchorAll.forEach((a, i) => {
    const cc = anchorCardColors[a.key] || anchorCardColors.stability;
    const isTop2 = i < 2;
    const bgStyle = isTop2 ? `background:${cc.bg}; border-left:4px solid ${cc.border};` : 'background:#F8FAFC; border-left:4px solid #E2E8F0;';
    const nameColor = isTop2 ? cc.textDark : '#94A3B8';
    const scoreColor = isTop2 ? cc.textDark : '#94A3B8';
    const descColor = isTop2 ? cc.textLight : '#94A3B8';
    anchorCardsHtml += `<div class="rounded p-md" style="${bgStyle}">
      <div class="flex justify-between items-center mb-xs">
        <span style="font-weight:800; color:${nameColor};">${a.def?.emoji} ${a.def?.korean}</span>
        <span style="font-weight:900; font-size:14pt; color:${scoreColor};">${a.score}</span>
      </div>
      <div style="font-size:9pt; color:${descColor}; line-height:1.6;">${anchorDescriptions[a.key] || ''}</div>
    </div>\n`;
  });

  // ─── ANCHOR_6CARDS_PLACEHOLDER ───
  h = h.replace('<!-- ANCHOR_6CARDS_PLACEHOLDER -->',
    `<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:6px; margin-bottom:14px;">\n    ${anchorCardsHtml}  </div>`
  );

  // 28가지 관심영역 교차점 텍스트
  const INTEREST_COMBOS: Record<string, string> = {
    'tech+business': '기술과 비즈니스의 교차점에서 제품의 가능성을 수익으로 전환하는 사람입니다. 테크 스타트업 PM이나 벤처 투자 분석가로서 빛을 발하며, 기술의 언어와 돈의 논리를 동시에 구사하는 드문 강점을 지닙니다.',
    'tech+social': '기술을 사회 문제 해결의 도구로 바라보는 시각이 탁월합니다. 공공 디지털 서비스 기획자나 사회혁신 테크 스타트업 리더로서, 코드 한 줄이 더 많은 사람을 돕는 방향을 설계할 수 있습니다.',
    'tech+creative': '데이터와 감성이 만나는 자리에서 새로운 경험을 창조합니다. UX 엔지니어나 인터랙티브 미디어 개발자로서, 기술로 아름다운 것을 만들어내는 사람만이 가진 희귀한 감각을 보유합니다.',
    'tech+health': '헬스케어의 미래를 디지털로 재설계하는 포지션입니다. 디지털 헬스 스타트업 기획자나 의료 AI 개발자로서, 생명과 기술이 접점을 이루는 가장 의미 있는 영역을 개척할 수 있습니다.',
    'tech+org': '조직의 비효율을 기술로 제거하는 전략적 시각을 갖추고 있습니다. IT 전략 컨설턴트나 디지털 트랜스포메이션 리더로서, 사람과 시스템을 동시에 이해하는 강점이 조직 전체를 바꿉니다.',
    'tech+education': '배움의 방식을 기술로 혁신하는 에듀테크의 핵심 인재입니다. 학습 플랫폼 기획자나 AI 튜터 설계자로서, 교육의 본질과 기술의 가능성을 함께 붙잡는 균형 감각이 차별점이 됩니다.',
    'tech+green': '지구의 지속 가능성을 기술로 가속화하는 그린테크 선구자입니다. 탄소 데이터 분석가나 클린테크 제품 개발자로서, 환경 위기를 공학적으로 해결하는 사람에게만 열리는 길을 걷습니다.',
    'business+social': '수익과 공익이 함께 성장하는 구조를 설계하는 사람입니다. 사회적 기업 전략가나 임팩트 투자 분석가로서, 돈의 흐름을 선한 방향으로 조율하는 능력이 세상을 실질적으로 바꿉니다.',
    'business+creative': '브랜드를 이야기로 만들고 이야기를 매출로 연결합니다. 크리에이티브 디렉터나 브랜드 마케터로서, 숫자와 감성을 동시에 다루는 사람만이 시장에서 진짜 차별화를 만들어냅니다.',
    'business+health': '건강 시장의 성장 기회를 먼저 포착하는 헬스 비즈니스 전문가입니다. 제약·바이오 사업개발 담당자나 웰니스 스타트업 CEO로서, 사람의 건강과 기업의 성장을 동시에 설계합니다.',
    'business+org': '조직을 전략적 자산으로 운영하는 경영의 핵심 포지션입니다. 경영 컨설턴트나 사업부 전략 기획자로서, 숫자로 조직을 진단하고 사람으로 성과를 만드는 통합 역량을 보유합니다.',
    'business+education': '교육을 하나의 산업으로 혁신하는 비전을 품고 있습니다. 에듀테크 사업 개발자나 교육 플랫폼 BM 기획자로서, 배움의 가치를 시장에서 실현하는 독보적인 안목이 있습니다.',
    'business+green': 'ESG 경영의 전략가로서 지속 가능성을 비즈니스 경쟁력으로 전환합니다. 기업 지속가능경영 담당자나 그린 파이낸스 전문가로서, 환경 책임과 재무 성과를 동시에 달성하는 길을 압니다.',
    'social+creative': '사회적 메시지를 강력한 콘텐츠로 증폭시키는 역할을 합니다. 소셜 캠페인 기획자나 공익 콘텐츠 크리에이터로서, 감동을 행동으로 바꾸는 스토리텔링이 세상을 움직이는 힘이 됩니다.',
    'social+health': '공중 보건과 복지의 최전선에서 사람을 돌보는 전문가입니다. 보건 정책 기획자나 지역사회 건강증진 매니저로서, 개인의 건강이 사회 전체의 건강과 연결됨을 이해하는 시각이 강점입니다.',
    'social+org': '공공 조직과 민간 협력을 조율하는 거버넌스 전문가입니다. 비영리 단체 운영 리더나 정부 혁신 담당자로서, 다양한 이해관계자를 하나의 목적으로 정렬하는 조직 설계 능력을 갖추고 있습니다.',
    'social+education': '교육으로 사회 불평등을 해소하는 변화의 촉매입니다. 교육 복지 정책 기획자나 공교육 혁신 프로그램 디렉터로서, 한 명의 배움이 공동체 전체를 바꿀 수 있다고 믿으며 실천합니다.',
    'social+green': '환경 정의와 사회 형평성을 함께 추구하는 그린 액티비스트입니다. 기후 정책 옹호자나 지속 가능한 도시 개발 기획자로서, 지구와 사람 모두를 위한 미래를 설계하는 사명감을 가집니다.',
    'creative+health': '건강과 웰니스를 매력적인 콘텐츠로 풀어내는 헬스 크리에이터입니다. 웰니스 브랜드 콘텐츠 디렉터나 헬스케어 UX 디자이너로서, 사람들이 건강을 즐겁게 받아들이도록 만드는 감각이 희귀합니다.',
    'creative+org': '조직 문화를 창의적으로 설계하는 이너 브랜드 전문가입니다. 기업 문화 크리에이티브 디렉터나 내부 커뮤니케이션 기획자로서, 조직 안에서 창의성이 살아 숨 쉬게 만드는 특별한 역할을 합니다.',
    'creative+education': '학습 경험 자체를 하나의 작품으로 만드는 교육 디자이너입니다. 러닝 익스피리언스 디자이너나 교육 콘텐츠 크리에이터로서, 배우는 즐거움을 창조하는 능력이 미래 교육의 핵심입니다.',
    'creative+green': '환경 메시지를 예술과 콘텐츠로 전파하는 그린 크리에이터입니다. 지속 가능한 패션 디렉터나 환경 캠페인 아티스트로서, 아름다움과 책임감을 함께 전달하는 독보적인 목소리를 지닙니다.',
    'health+org': '건강하고 지속 가능한 조직을 설계하는 웰니스 리더입니다. 기업 웰니스 프로그램 매니저나 조직 건강 컨설턴트로서, 구성원이 건강해야 조직도 강해진다는 본질을 전략으로 구현합니다.',
    'health+education': '건강 지식을 생애 전반에 걸쳐 가르치는 헬스 에듀케이터입니다. 건강 리터러시 교육 기획자나 의료 커뮤니케이터로서, 올바른 건강 정보를 누구나 이해할 수 있게 전달하는 역할을 합니다.',
    'health+green': '자연과 인체가 연결된 생태적 건강을 추구하는 전문가입니다. 친환경 의료 시스템 기획자나 생태 웰니스 프로그램 디렉터로서, 지구의 건강과 사람의 건강이 하나임을 실천으로 보여줍니다.',
    'org+education': '조직을 학습하는 생태계로 만드는 L&D 전문가입니다. 기업 교육 디렉터나 인재 개발 전략가로서, 사람이 성장할수록 조직도 성장한다는 원칙 위에 강력한 커리어를 쌓아갑니다.',
    'org+green': '지속 가능한 경영을 조직 내부부터 실현하는 그린 경영 전문가입니다. ESG 전략 담당자나 지속 가능 공급망 매니저로서, 조직의 의사 결정 하나하나가 지구에 미치는 영향을 설계합니다.',
    'education+green': '미래 세대에게 지구를 지키는 지혜를 가르치는 환경 교육자입니다. 기후 리터러시 커리큘럼 설계자나 지속 가능 교육 프로그램 기획자로서, 배움이 지구를 살리는 가장 긴 호흡의 투자임을 압니다.',
  };

  const INTEREST_DESCS: Record<string, { desc: string; careerHint: string }> = {
    tech:      { desc: '기술이 세상을 바꾸는 방식에 끌립니다. 새로운 것을 만들고, 더 빠르고 효율적인 방법을 찾는 과정 자체에서 에너지를 얻습니다.', careerHint: '제품·서비스를 직접 만들거나 기술이 산업에 적용되는 접점에서 일할 때 가장 활기를 느낍니다. "어떻게 하면 더 잘 작동할까?"가 늘 머릿속에 맴도는 유형입니다.' },
    business:  { desc: '돈이 흐르는 방식, 시장이 움직이는 구조에 관심이 많습니다. 전략적 판단과 숫자 뒤의 맥락을 읽는 것을 즐깁니다.', careerHint: '비즈니스 모델을 설계하거나 의사결정에 영향을 미치는 자리에 있을 때 가장 몰입합니다. 이익과 영향력이 교차하는 지점을 본능적으로 찾습니다.' },
    social:    { desc: '사람과 사회 구조에 민감합니다. 불합리한 것을 보면 해결책을 찾고 싶어지고, 함께 잘 살아가는 방법을 고민합니다.', careerHint: '내가 하는 일이 세상에 실제로 도움이 된다는 느낌이 중요합니다. 정책, 복지, 임팩트 비즈니스에서 강한 동기를 경험합니다.' },
    creative:  { desc: '표현하고 만들고 싶은 욕구가 강합니다. 콘텐츠, 디자인, 브랜드 — 무언가를 세상에 내놓는 행위 자체가 보람입니다.', careerHint: '창작물이 사람들에게 닿는 순간을 위해 일하는 구조가 잘 맞습니다. 기획·연출·편집 등 표현의 전 과정에 자연스럽게 관여하려 합니다.' },
    health:    { desc: '사람의 몸과 마음, 삶의 질에 관심이 높습니다. 건강이 단순한 의료를 넘어 라이프스타일 전반으로 확장된다고 느낍니다.', careerHint: '헬스케어, 뷰티·웰니스, 의료 서비스 기획 등에서 "사람에게 실질적으로 좋은 것"을 만들 때 만족감을 느낍니다.' },
    org:       { desc: '조직이 어떻게 움직이는지, 사람들이 어떻게 협력하는지에 관심이 많습니다. 구조와 문화, 동기부여 메커니즘을 관찰합니다.', careerHint: 'HR, 조직문화, 경영 전략 등 "사람이 잘 일하는 환경"을 설계하는 역할에서 두각을 나타냅니다.' },
    education: { desc: '배움과 성장이 어떻게 일어나는지에 흥미를 느낍니다. 누군가가 이해의 순간을 맞이할 때 함께 기뻐하는 사람입니다.', careerHint: '교육 콘텐츠 기획, 코칭, 러닝 디자인 등 "성장을 설계하는 일"에서 남다른 에너지를 발휘합니다.' },
    green:     { desc: '지구와 미래 세대를 생각합니다. 지속가능성, 탄소중립, 자원순환 — 환경 의제가 실제 비즈니스와 연결되는 방식에 주목합니다.', careerHint: 'ESG 전략, 그린테크, 환경 정책 등에서 "옳은 방향으로 가고 있다"는 확신이 강한 동기가 됩니다.' },
  };

  const INTEREST_DATA: Record<string, { korean: string; color: string; tagClass: string; orgs: Record<string, { title: string; companies: string; tags: string[] }> }> = {
    tech: { korean: '기술·혁신', color: 'var(--cr)', tagClass: 'tag-co',
      orgs: {
        startup: { title: 'IT 스타트업', companies: '토스, 당근, 뤼튼, 채널톡, 센드버드, 리멤버, 클래스101, 마켓컬리, 오늘의집', tags: ['BD', '콘텐츠', 'PM'] },
        foreign_corp: { title: '글로벌 테크', companies: '구글, MS, AWS, SAP, 세일즈포스, 오라클, IBM, 어도비, 시스코', tags: ['BD', '파트너십', 'PM'] },
        hidden_champ: { title: '기술 강소', companies: '하이비전시스템, 이오테크닉스, 알체라, 마인즈랩, 뷰노, 크래프톤', tags: ['기획', 'R&D'] },
        large_corp: { title: '대기업 IT', companies: '삼성SDS, LG CNS, SK C&C, 카카오, 네이버, 라인', tags: ['개발', 'PM', '기획'] },
        mid_corp: { title: '중견 IT', companies: '더존비즈온, 한글과컴퓨터, 안랩, 이스트소프트, 핸디소프트', tags: ['기획', '영업'] },
        freelance: { title: '프리랜서 개발/기획', companies: '위시켓, 크몽, 탈잉, 프리모아 등 플랫폼 활용', tags: ['개발', '기획', 'PM'] },
        social_ent: { title: '테크 소셜벤처', companies: '코드스테이츠, 엘리스, 멋쟁이사자처럼, SW마에스트로', tags: ['교육', '기획'] },
        public_org: { title: 'IT 공공기관', companies: 'NIA(정보화진흥원), KISA, 과기정통부 산하기관', tags: ['정책', '연구'] },
        civil_servant: { title: '디지털 공무원', companies: '과기정통부, 디지털플랫폼정부위원회, 지자체 스마트시티', tags: ['정책', '기획'] },
      }},
    business: { korean: '비즈니스·금융', color: '#854D0E', tagClass: 'tag-warn',
      orgs: {
        startup: { title: '핀테크 스타트업', companies: '뱅크샐러드, 핀다, 레몬베이스, 페이히어, 두나무, 코인원, 파운트', tags: ['BD', '제휴', '마케팅'] },
        foreign_corp: { title: '외국계 금융·컨설팅', companies: '맥킨지, BCG, 베인, 골드만삭스, JP모건, 딜로이트, EY, KPMG, PwC', tags: ['전략', '분석', 'IB'] },
        hidden_champ: { title: '금융 강소', companies: '피플펀드, 렌딧, 코리아크레딧뷰로, 나이스평가정보, KCB', tags: ['분석', '기획'] },
        large_corp: { title: '대기업 금융', companies: '삼성생명, KB금융, 신한금융, 하나금융, NH투자증권', tags: ['기획', '분석', 'IB'] },
        mid_corp: { title: '중견 금융', companies: '메리츠화재, DB손해보험, 한화투자증권, 교보생명', tags: ['영업', '심사'] },
        freelance: { title: '독립 컨설턴트', companies: '경영 컨설팅, 재무 자문, 투자 분석 프리랜서', tags: ['전략', '분석'] },
        social_ent: { title: '소셜 금융', companies: '한국사회투자, 소풍벤처스, 옐로우독, 크레비스파트너스', tags: ['투자', '기획'] },
        public_org: { title: '금융 공공기관', companies: '금융감독원, 한국은행, 예금보험공사, 수출입은행', tags: ['감독', '분석'] },
        civil_servant: { title: '금융 공무원', companies: '기획재정부, 금융위원회, 국세청', tags: ['정책', '세무'] },
      }},
    social: { korean: '사회·공공', color: '#22C55E', tagClass: 'tag-co',
      orgs: {
        startup: { title: '소셜 임팩트', companies: '트리플래닛, 루트임팩트, 임팩트스퀘어, 크레비스파트너스', tags: ['기획', 'PM'] },
        social_ent: { title: '사회적기업/NGO', companies: '아름다운재단, 굿네이버스, 월드비전, 아이쿱, 동구밭', tags: ['기획', '교육', '상담'] },
        public_org: { title: '공공기관', companies: '한국사회적기업진흥원, 한국보건사회연구원, 국민건강보험공단', tags: ['정책', '연구'] },
        large_corp: { title: '대기업 CSR', companies: '삼성 사회공헌팀, SK 행복나눔재단, 현대차 정몽구재단', tags: ['기획', 'ESG'] },
        foreign_corp: { title: '국제기구', companies: 'UN, UNDP, UNICEF, WHO, World Bank 한국사무소', tags: ['정책', '연구'] },
        freelance: { title: '소셜 프리랜서', companies: '사회혁신 컨설턴트, NPO 자문, ESG 컨설팅', tags: ['컨설팅', '기획'] },
        civil_servant: { title: '사회복지 공무원', companies: '보건복지부, 여성가족부, 지자체 복지정책과', tags: ['정책', '복지'] },
      }},
    creative: { korean: '창작·콘텐츠', color: '#8B5CF6', tagClass: 'tag-ar',
      orgs: {
        startup: { title: '콘텐츠 스타트업', companies: '콘텐타, 플립, 스냅타임, 밀리의서재, 퍼블리', tags: ['기획', '콘텐츠', 'PD'] },
        foreign_corp: { title: '글로벌 콘텐츠', companies: '넷플릭스, 디즈니+, 스포티파이, 유튜브, 틱톡', tags: ['콘텐츠', '마케팅'] },
        large_corp: { title: '대기업 미디어', companies: 'CJ ENM, HYBE, SM, JYP, 카카오엔터, 네이버웹툰', tags: ['기획', 'PD', '마케팅'] },
        hidden_champ: { title: '크리에이티브 강소', companies: '스튜디오좋, 바이널브랜즈, 레이어, 디자인프레스', tags: ['디자인', '브랜드'] },
        freelance: { title: '크리에이터/프리랜서', companies: '유���브 크리에이터, 콘텐츠 프리랜서, 작가, 디자이너', tags: ['창작', '기획'] },
        social_ent: { title: '문화예술 소셜', companies: '예술의전당, 국립현대미술관, 서울문화재단', tags: ['기획', '운영'] },
      }},
    health: { korean: '건강·웰빙', color: '#EF4444', tagClass: 'tag-bad',
      orgs: {
        startup: { title: '헬스케어 스타트업', companies: '닥터나우, 굿닥, 휴레이포지티브, 눔코리아, 캐시워크', tags: ['기획', 'PM', '마케팅'] },
        foreign_corp: { title: '글로벌 헬스', companies: '존슨앤존슨, 화이자, 로슈, 메드트로닉, 사노피', tags: ['마케팅', 'BD', '임상'] },
        large_corp: { title: '대기업 헬스', companies: '삼성바이오로직스, 셀트리온, SK바이오사이언스, GC녹십자', tags: ['기획', '영업'] },
        public_org: { title: '보건 공공', companies: '질병관리청, 건강보험심사평가원, 국민건강보험공단', tags: ['정책', '연구'] },
        freelance: { title: '웰니스 프리랜서', companies: '건강 코칭, 피트니스 컨설팅, 헬스케어 콘텐츠', tags: ['코칭', '콘텐츠'] },
      }},
    org: { korean: '조직·경영', color: '#3B82F6', tagClass: 'tag-su',
      orgs: {
        startup: { title: 'HR테크 스타트업', companies: '플렉스, 그리팅, 레몬베이스, 원티드랩, 리멤버', tags: ['HR', 'PM', 'CS'] },
        foreign_corp: { title: '글로벌 HR', companies: '링크드인, 인디드, 머서, 에이온휴잇, 워크데이', tags: ['컨설팅', '분석'] },
        large_corp: { title: '대기업 HR', companies: '삼성 인사팀, LG 조직문화, SK 행복추구위원회, 현대차 인재개발원', tags: ['인사', '교육', '조직문화'] },
        hidden_champ: { title: '조직 컨설팅', companies: '헤이그룹, 타워스왓슨, 잡플래닛, 사람인HR', tags: ['컨설팅', '채용'] },
        freelance: { title: 'HR 프리랜서', companies: '조직문화 컨설턴트, 채용 전문가, 교육 설계', tags: ['컨설팅', '교육'] },
      }},
    education: { korean: '교육·성장', color: '#F59E0B', tagClass: 'tag-warn',
      orgs: {
        startup: { title: '에듀테크 스타트업', companies: '매스프레소(콴다), 엘리스, 프로그래머스, 클래스101, 인프런', tags: ['기획', '콘텐츠', 'PM'] },
        large_corp: { title: '교육 대기업', companies: '메가스터디, 비상교육, 대교, 웅진씽크빅, 에스티유니타스', tags: ['기획', '마케팅'] },
        foreign_corp: { title: '글로벌 에듀테크', companies: '코세라, 유데미, 듀오링고, 칸아카데미', tags: ['기획', '콘텐츠'] },
        public_org: { title: '교육 공공기관', companies: '한국교육개발원, 한국직업능력연구원, 교육부 산하기관', tags: ['연구', '정책'] },
        freelance: { title: '교육 프리랜서', companies: '강사, 코치, 교육 컨설턴트, 온라인 강의 크리에이터', tags: ['교육', '코칭'] },
      }},
    green: { korean: '환경·지속가능', color: '#16A34A', tagClass: 'tag-co',
      orgs: {
        startup: { title: '그린테크', companies: '에너지엑스, 에코프로, 씨에스윈드, 한화솔루션(큐셀)', tags: ['기획', 'R&D'] },
        public_org: { title: '환경 공공', companies: '한국환경공단, 환경부, 그린피스코리아, 기후변화센터', tags: ['정책', '연구'] },
        large_corp: { title: '대기업 ESG', companies: 'SK ESG추진단, 삼성 환경안전센터, 포스코 탄소중립', tags: ['ESG', '기획'] },
        foreign_corp: { title: '글로벌 환경', companies: '테슬라, 베스타스, 오스테드, 넥스트에라에너지', tags: ['기획', 'BD'] },
        freelance: { title: '환경 프리랜서', companies: 'ESG 컨설팅, 탄소중립 자문, 환경영향평가', tags: ['컨설팅', '분석'] },
      }},
  };

  // ─── 관심영역 변수 (FA_BRIDGE보다 먼저 선언) ───
  const faInterest1 = r.interestSorted?.[0]?.[0] || 'tech';
  const faInterest2 = r.interestSorted?.[1]?.[0] || 'business';
  const faInt1Data = INTEREST_DATA[faInterest1] || INTEREST_DATA.tech;
  const faInt2Data = INTEREST_DATA[faInterest2] || INTEREST_DATA.business;
  const faInt1Desc = INTEREST_DESCS[faInterest1] || INTEREST_DESCS.tech;
  const faInt2Desc = INTEREST_DESCS[faInterest2] || INTEREST_DESCS.business;
  const faComboKey = [faInterest1, faInterest2].sort().join('+');
  const faComboText = INTEREST_COMBOS[faComboKey] || `${faInt1Data.korean}과 ${faInt2Data.korean}이 만나는 지점에 당신만의 포지션이 있습니다.`;

  // ─── FA_BRIDGE_PLACEHOLDER ───
  const fxaNarrative = (FOCUS_ANCHOR_NARRATIVES as any)?.[focusTypeName]?.[a1Key];
  const fxaCareers = (fxaNarrative?.careers || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  const careerCards = fxaCareers.slice(0, 3).map((career: string, i: number) => {
    const colors = [pt?.color, anchorAll[0].def?.color || '#F59E0B', '#EAB308'];
    return `<div class="rounded p-md mb-sm" style="background:#1E293B; border-left:5px solid ${colors[i] || '#94A3B8'};">
    <div style="font-weight:700; color:white; font-size:13pt; margin-bottom:4px;">${career}</div>
  </div>`;
  }).join('\n  ');
  const faBridgePage = `<div class="page bg-dark" style="padding-top:22mm;">
  <div class="pg-head"><span style="color:${pt?.color}; font-weight:700;">F</span><span style="color:#94A3B8;">×</span><span style="color:${anchorAll[0].def?.color || '#F59E0B'}; font-weight:700;">A</span><span style="color:#94A3B8;">&nbsp;&nbsp;Focus × Anchor 교차 해석</span></div>

  <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px;">
    <div style="width:40px; height:40px; border-radius:50%; background:${pt?.color}; display:flex; align-items:center; justify-content:center; font-size:16pt; font-weight:900; color:white;">F</div>
    <div style="font-size:18pt; color:#94A3B8;">×</div>
    <div style="width:40px; height:40px; border-radius:50%; background:${anchorAll[0].def?.color || '#F59E0B'}; display:flex; align-items:center; justify-content:center; font-size:16pt; font-weight:900; color:white;">A</div>
    <div style="font-size:11pt; color:#CBD5E1; margin-left:8px;">${pt?.korean} × ${anchorAll[0].def?.korean}·${anchorAll[1].def?.korean}</div>
  </div>

  <div style="font-size:22pt; font-weight:900; color:white; line-height:1.3; margin-bottom:16px;">
    ${fxaNarrative?.title || `${anchorAll[0].def?.korean}을 추구하는 ${pt?.korean}`}
  </div>

  <div style="font-size:11pt; color:#94A3B8; line-height:1.8; margin-bottom:14px;">
    ${fxaNarrative?.narrative || `당신의 ${pt?.korean} 성향과 ${anchorAll[0].def?.korean} 가치관이 결합된 독특한 커리어 방향이 있습니다.`}
  </div>

  <div style="height:1px; background:#334155; margin:14px 0;"></div>
  <div style="font-size:14pt; font-weight:700; color:white; margin-bottom:12px;">이 조합이 가리키는 커리어 방향</div>
  ${careerCards}

  <div style="height:1px; background:#334155; margin:14px 0;"></div>
  <div style="font-size:11pt; font-weight:700; color:#94A3B8; margin-bottom:10px; letter-spacing:0.5px;">🌐 관심 세계 — 총정리</div>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
    <div style="background:#1E293B; border-radius:10px; padding:12px 14px; border-left:3px solid ${faInt1Data.color};">
      <div style="font-size:9pt; color:#64748B; margin-bottom:4px;">관심 1순위</div>
      <div style="font-size:13pt; font-weight:800; color:white; margin-bottom:4px;">${faInt1Data.korean}</div>
      <div style="font-size:9.5pt; color:#94A3B8; line-height:1.6;">${faInt1Desc.desc}</div>
    </div>
    <div style="background:#1E293B; border-radius:10px; padding:12px 14px; border-left:3px solid #EAB308;">
      <div style="font-size:9pt; color:#64748B; margin-bottom:4px;">관심 2순위</div>
      <div style="font-size:13pt; font-weight:800; color:white; margin-bottom:4px;">${faInt2Data.korean}</div>
      <div style="font-size:9.5pt; color:#94A3B8; line-height:1.6;">${faInt2Desc.desc}</div>
    </div>
  </div>
  <div style="background:#0F172A; border:1px solid #334155; border-radius:10px; padding:14px 16px;">
    <div style="font-size:9.5pt; color:#60A5FA; font-weight:700; margin-bottom:6px;">🔀 F × A × 관심영역 교차 인사이트</div>
    <div style="font-size:10.5pt; color:#CBD5E1; line-height:1.75;">${pt?.korean} 유형의 ${anchorAll[0].def?.korean} 추구자가 <strong style="color:white;">${faInt1Data.korean}</strong> 세계에 발을 딛는다면 — ${faComboText}</div>
  </div>

  <div class="pg-foot"><span>FACE Career Report</span><span>9</span></div>
</div>`;
  h = h.replace('<!-- FA_BRIDGE_PLACEHOLDER -->', faBridgePage);

  // ─── F×A 뒤에 산업 교차 + 체크리스트 페이지 삽입 ───
  const topOrgs = catMatches.slice(0, 3);
  const { interestSorted } = r;

  // 관심영역 코드 → 한글 매핑 + 산업/기업 데이터

  // 상위 2개 관심영역
  const interest1 = interestSorted?.[0]?.[0] || 'tech';
  const interest2 = interestSorted?.[1]?.[0] || 'business';
  const int1Data = INTEREST_DATA[interest1] || INTEREST_DATA.tech;
  const int2Data = INTEREST_DATA[interest2] || INTEREST_DATA.business;

  // ─── ANCHOR_INTERESTS_PLACEHOLDER ───
  const int1Tags = Object.values(int1Data.orgs).flatMap((o: any) => o.tags).slice(0, 5);
  const int2Tags = Object.values(int2Data.orgs).flatMap((o: any) => o.tags).slice(0, 4);
  const int1Desc = INTEREST_DESCS[interest1] || INTEREST_DESCS.tech;
  const int2Desc = INTEREST_DESCS[interest2] || INTEREST_DESCS.business;
  // 대표 기업 3개씩 (첫 번째 orgs 항목에서 추출)
  const int1RepOrg = Object.values(int1Data.orgs)[0] as any;
  const int2RepOrg = Object.values(int2Data.orgs)[0] as any;
  const interestsHtml = `<hr class="divider">
  <div class="t-h4 mb-sm">관심 영역 — 어떤 세계에 끌리나요?</div>
  <div style="margin-bottom:14px;">
    <div class="card mb-sm" style="border-left:4px solid ${int1Data.color}; padding:16px 18px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <span style="font-size:9pt; font-weight:700; color:${int1Data.color}; background:${int1Data.color}18; padding:2px 8px; border-radius:4px;">1순위</span>
        <span style="font-size:15pt; font-weight:900; color:#1E293B;">${int1Data.korean}</span>
      </div>
      <div style="font-size:10.5pt; color:#374151; line-height:1.7; margin-bottom:8px;">${int1Desc.desc}</div>
      <div style="font-size:10pt; color:#6B7280; line-height:1.7; margin-bottom:10px; padding:8px 12px; background:#F8FAFC; border-radius:8px;">💡 ${int1Desc.careerHint}</div>
      <div>${int1Tags.map((t: string) => `<span class="tag tag-cr">${t}</span>`).join('')}</div>
    </div>
    <div class="card" style="border-left:4px solid #EAB308; padding:16px 18px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <span style="font-size:9pt; font-weight:700; color:#854D0E; background:#FEF9C318; padding:2px 8px; border-radius:4px;">2순위</span>
        <span style="font-size:15pt; font-weight:900; color:#1E293B;">${int2Data.korean}</span>
      </div>
      <div style="font-size:10.5pt; color:#374151; line-height:1.7; margin-bottom:8px;">${int2Desc.desc}</div>
      <div style="font-size:10pt; color:#6B7280; line-height:1.7; margin-bottom:10px; padding:8px 12px; background:#F8FAFC; border-radius:8px;">💡 ${int2Desc.careerHint}</div>
      <div>${int2Tags.map((t: string) => `<span class="tag tag-warn">${t}</span>`).join('')}</div>
    </div>
  </div>
  <div class="card" style="background:#F1F5F9; padding:14px 16px;">
    <div style="font-size:10pt; font-weight:700; color:#475569; margin-bottom:6px;">🔀 두 관심의 교차점</div>
    <div style="font-size:10.5pt; color:#374151; line-height:1.7;">${int1Data.korean}과 ${int2Data.korean}에 동시에 끌린다는 것은, 단순히 좋아하는 것이 두 개라는 뜻이 아닙니다. 두 영역이 만나는 지점 — 예를 들어 <strong>${int1RepOrg?.title || int1Data.korean}</strong>처럼 ${int1Data.korean} 문제를 ${int2Data.korean}적 시각으로 풀어내는 역할 — 에서 당신만의 포지션이 나올 수 있습니다.</div>
  </div>`;
  // ─── INTEREST_PAGE_PLACEHOLDER (전용 페이지) ───
  const interestComboKey = [interest1, interest2].sort().join('+');
  const interestComboText = INTEREST_COMBOS[interestComboKey] || `${int1Data.korean}과 ${int2Data.korean}에 동시에 끌린다는 것은, 두 영역이 만나는 지점에서 당신만의 포지션이 나온다는 신호입니다.`;
  const int1RepOrg2 = Object.values(int1Data.orgs)[0] as any;
  const int2RepOrg2 = Object.values(int2Data.orgs)[0] as any;

  const interestPageHtml = `<div class="page" style="padding-top:22mm;">
  <div class="pg-head"><span style="color:var(--an); font-weight:700;">Part 2</span><span>나는 누구인가 — 관심 영역</span></div>
  <div class="t-h2 mb-xs">어떤 세계에 끌리나요?</div>
  <div class="t-body mb-lg" style="color:#475569;">같은 유형이라도 어떤 세계에 관심을 두느냐에 따라 커리어 방향이 완전히 달라집니다.</div>

  <div class="card mb-md" style="border-left:4px solid ${int1Data.color}; padding:18px 20px;">
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
      <span style="font-size:9pt; font-weight:700; color:${int1Data.color}; background:${int1Data.color}20; padding:3px 10px; border-radius:5px;">1순위</span>
      <span style="font-size:17pt; font-weight:900; color:#1E293B;">${int1Data.korean}</span>
    </div>
    <div style="font-size:11pt; color:#374151; line-height:1.75; margin-bottom:10px;">${int1Desc.desc}</div>
    <div style="font-size:10.5pt; color:#6B7280; line-height:1.7; padding:10px 14px; background:#F8FAFC; border-radius:8px; margin-bottom:10px;">💡 ${int1Desc.careerHint}</div>
    <div style="font-size:10pt; color:#94A3B8; margin-bottom:6px;">대표 영역</div>
    <div>${int1Tags.map((t: string) => `<span class="tag tag-cr">${t}</span>`).join('')}</div>
  </div>

  <div class="card mb-lg" style="border-left:4px solid #EAB308; padding:18px 20px;">
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
      <span style="font-size:9pt; font-weight:700; color:#854D0E; background:#FEF9C320; padding:3px 10px; border-radius:5px;">2순위</span>
      <span style="font-size:17pt; font-weight:900; color:#1E293B;">${int2Data.korean}</span>
    </div>
    <div style="font-size:11pt; color:#374151; line-height:1.75; margin-bottom:10px;">${int2Desc.desc}</div>
    <div style="font-size:10.5pt; color:#6B7280; line-height:1.7; padding:10px 14px; background:#F8FAFC; border-radius:8px; margin-bottom:10px;">💡 ${int2Desc.careerHint}</div>
    <div style="font-size:10pt; color:#94A3B8; margin-bottom:6px;">대표 영역</div>
    <div>${int2Tags.map((t: string) => `<span class="tag tag-warn">${t}</span>`).join('')}</div>
  </div>

  <div class="card" style="background:linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding:22px; color:white;">
    <div style="font-size:11pt; font-weight:800; color:#94A3B8; margin-bottom:10px; letter-spacing:0.5px;">🔀 두 관심의 교차점 — 당신만의 포지션</div>
    <div style="font-size:12pt; line-height:1.8; color:white;">${interestComboText}</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:16px;">
      <div style="background:#FFFFFF10; border-radius:10px; padding:12px 14px;">
        <div style="font-size:9pt; color:#94A3B8; margin-bottom:4px;">${int1Data.korean} 대표 진입로</div>
        <div style="font-size:10.5pt; font-weight:700; color:white;">${int1RepOrg2?.title || int1Data.korean}</div>
        <div style="font-size:9pt; color:#64748B; margin-top:3px; line-height:1.5;">${(int1RepOrg2?.companies || '').split(',').slice(0,3).join(', ')}</div>
      </div>
      <div style="background:#FFFFFF10; border-radius:10px; padding:12px 14px;">
        <div style="font-size:9pt; color:#94A3B8; margin-bottom:4px;">${int2Data.korean} 대표 진입로</div>
        <div style="font-size:10.5pt; font-weight:700; color:white;">${int2RepOrg2?.title || int2Data.korean}</div>
        <div style="font-size:9pt; color:#64748B; margin-top:3px; line-height:1.5;">${(int2RepOrg2?.companies || '').split(',').slice(0,3).join(', ')}</div>
      </div>
    </div>
  </div>

  <div class="pg-foot"><span>FACE Career Report</span><span>10</span></div>
</div>`;
  h = h.replace('<!-- INTEREST_PAGE_PLACEHOLDER -->', interestPageHtml);

  // Top 3 조직 카테고리 키
  const orgKeys = topOrgs.map((o: any) => o.category);

  // 테이블 셀 생성 (다크 테마)
  const makeCell = (intData: typeof int1Data, orgKey: string) => {
    const cell = intData.orgs[orgKey];
    if (!cell) return `<div style="background:#1E293B; padding:12px 16px;"><div style="font-size:9pt; color:#475569;">해당 없음</div></div>`;
    return `<div style="background:#1E293B; padding:12px 16px;">
      <div style="font-weight:700; font-size:11pt; margin-bottom:3px; color:white;">${cell.title}</div>
      <div style="font-size:9pt; color:#94A3B8; line-height:1.6;">${cell.companies}</div>
      <div class="mt-xs">${cell.tags.map(t => `<span class="tag" style="font-size:8pt; background:#334155; color:#CBD5E1;">${t}</span>`).join('')}</div>
    </div>`;
  };

  const orgEmojis: Record<string, string> = { startup: '🚀', foreign_corp: '🌍', hidden_champ: '🔬', large_corp: '🏛', mid_corp: '🏢', public_org: '🏥', social_ent: '🌱', freelance: '💼', civil_servant: '📋' };

  const crossPage = `
<div class="page bg-dark" style="padding-top:22mm;">
  <div class="pg-head"><span style="color:var(--co); font-weight:700;">F</span><span style="color:#475569;">×</span><span style="color:var(--cr); font-weight:700;">A</span><span style="color:#64748B;">&nbsp;&nbsp;관심 산업 × 조직 교차 추천</span></div>
  <div class="t-h3" style="color:white; margin-bottom:8px;">관심 산업 × 조직유형 교차 추천</div>
  <div style="font-size:11pt; color:#94A3B8; line-height:1.8; margin-bottom:16px;">당신의 관심 영역(${int1Data.korean}, ${int2Data.korean})과 맞는 조직유형(${topOrgs.map((o: any) => o.korean).join(', ')})을 교차하면, 구체적인 방향이 나옵니다.</div>

  <div style="display:grid; grid-template-columns:auto 1fr 1fr 1fr; gap:2px; border-radius:14px; overflow:hidden; margin-bottom:16px;">
    <div style="background:#0F172A; padding:12px 16px;"></div>
    ${topOrgs.map((o: any) => `<div style="background:#0F172A; color:white; padding:12px 16px; font-weight:700; text-align:center; font-size:10pt;">${orgEmojis[o.category] || ''} ${o.korean}</div>`).join('\n    ')}
    <div style="background:#1E293B; padding:12px 16px; font-weight:700; color:${int1Data.color};">${int1Data.korean}</div>
    ${orgKeys.map((k: string) => makeCell(int1Data, k)).join('\n    ')}
    <div style="background:#1E293B; padding:12px 16px; font-weight:700; color:${int2Data.color};">${int2Data.korean}</div>
    ${orgKeys.map((k: string) => makeCell(int2Data, k)).join('\n    ')}
  </div>

  <div class="rounded" style="background:#1E293B; border:1.5px solid #334155; padding:16px 20px;">
    <div style="font-size:13pt; font-weight:700; color:white; margin-bottom:8px;">💡 조직 선택 체크리스트</div>
    <div style="font-size:11pt; color:#94A3B8; margin-bottom:10px;">지원하기 전에 이것만 확인하세요. 당신의 Anchor 기반 필수 조건입니다.</div>
    <div style="font-size:11pt; line-height:2; color:#CBD5E1;">
      <div class="check-item"><div class="check-box" style="border-color:#475569;"></div>${anchorInterpData?.[a1Key]?.question || `${anchorAll[0].def?.korean} 가치를 충족하는 조직인가?`} <span class="tag" style="font-size:8pt; background:#422006; color:#FBBF24;">${anchorAll[0].def?.korean}</span></div>
      <div class="check-item"><div class="check-box" style="border-color:#475569;"></div>${anchorInterpData?.[a2Key]?.question || `${anchorAll[1].def?.korean} 가치를 충족하는 조직인가?`} <span class="tag" style="font-size:8pt; background:#172554; color:#60A5FA;">${anchorAll[1].def?.korean}</span></div>
      <div class="check-item"><div class="check-box" style="border-color:#475569;"></div>이 조직의 규모·문화가 ${topOrgName}에 해당하는가? <span class="tag" style="font-size:8pt; background:#1e1b4b; color:#a5b4fc;">조직유형</span></div>
    </div>
  </div>

  <!-- 다음 챕터 연결 -->
  <div style="background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:14px 20px; display:flex; align-items:center; gap:14px; margin-top:16px;">
    <div style="width:40px; height:40px; border-radius:50%; background:rgba(34,197,94,.25); display:flex; align-items:center; justify-content:center; font-size:18pt; font-weight:900; color:#4ADE80; flex-shrink:0;">C</div>
    <div>
      <div style="font-size:9.5pt; color:#64748B; margin-bottom:2px;">다음 챕터</div>
      <div style="font-size:11pt; font-weight:700; color:white;">Capacity — 지금 당신이 가진 역량을 측정합니다</div>
      <div style="font-size:9.5pt; color:#64748B; margin-top:2px;">나다움·확장·성장 가능성 역량 진단 + 직무별 적합도 분석</div>
    </div>
  </div>

  <div class="pg-foot"><span>FACE Career Report</span><span></span></div>
</div>`;

  // ─── CROSS_ORG_PLACEHOLDER ───
  h = h.replace('<!-- CROSS_ORG_PLACEHOLDER -->', crossPage);

  // ─── CORE_FIT_1_PLACEHOLDER ───
  const coreFit1 = coreJobs[0];
  if (coreFit1) {
    const fit1Mapping = (JOB_COMPETENCY_MAPPING as any[]).find(j => j.job === coreFit1.job);
    const fit1Comps = (fit1Mapping?.comps || [])
      .filter((code: string) => code !== 'Fd1' && code !== 'Fd2')
      .slice(0, 8)
      .map((code: string) => {
        const compScore = (allScored.find((c: any) => c.code === code) as any)?.score || 25;
        const nadaumLevel = calcNadaumLevel(code, focusTypeName, focusSecondaryName).level;
        const nadaumTag = nadaumLevel === 'nadaum'
          ? `<span class="tag tag-co" style="font-size:8pt;">🟢 나다움</span>`
          : nadaumLevel === 'half_nadaum'
          ? `<span class="tag tag-muted" style="font-size:8pt;">기초</span>`
          : `<span class="tag tag-bad" style="font-size:8pt;">🔴 非나다움</span>`;
        const barColor = compScore >= 70 ? 'var(--good)' : compScore >= 50 ? '#86EFAC' : '#FDE68A';
        return `<div class="bar"><div class="bar-top"><span class="bar-name" style="flex:1; min-width:0;">${(COMP_NAMES as any)[code] || code} ${nadaumTag}</span><span class="bar-score" style="white-space:nowrap; min-width:28px; text-align:right;">${compScore}</span></div><div class="bar-track" style="overflow:hidden;"><div class="bar-fill" style="width:${Math.min(compScore,100)}%; max-width:100%; background:${barColor}; border-radius:5px;"></div><div class="bar-mark" style="left:70%; background:#94A3B8;"></div><div class="bar-mark" style="left:85%; background:#334155;"></div></div></div>`;
      });
    const quadrantBadge = coreFit1.quadrant?.label || '';
    const coreFit1Page = `<div class="page" style="padding-top:22mm;">
  <div class="pg-head"><span class="fc-su" style="font-weight:700;">Part 3</span><span>나에게 맞는 일 — Core Fit #1</span></div>

  <div class="flex justify-between items-center mb-sm">
    <div>
      <div class="t-small" style="color:${pt?.color}; font-weight:700;">Core Fit #1</div>
      <div class="t-h1" style="margin:0;">${coreFit1.job}</div>
    </div>
    <div class="gauge" style="width:80px; height:80px; font-size:24pt; background:var(--good);">${coreFit1.pct}</div>
  </div>
  <div class="t-small mb-md">${coreFit1.category} 카테고리 &nbsp;|&nbsp; 나다움 적합도 ${coreFit1.nadaumPct}% &nbsp;|&nbsp; ${quadrantBadge}</div>

  <div class="t-h4 mb-sm">핵심역량 ${fit1Comps.length}개 분석</div>
  <div class="card" style="padding:18px 22px;">
    ${fit1Comps.join('\n    ')}
    <div class="t-small mt-sm" style="color:var(--muted);">┃ A급(70) &nbsp;&nbsp; ┃ S급(85) 기준선</div>
  </div>

  <div class="mt-md rounded-lg p-md" style="background:#F0FDF4; border:1.5px solid #BBF7D0;">
    <div class="t-h4 fc-co mb-xs">💡 이 직무에서 당신의 포지션</div>
    <div class="t-body">
      <strong>${pt?.korean} 유형</strong>으로서 ${coreFit1.job} 직무의 핵심역량 중 나다움 비율이 <strong>${coreFit1.nadaumPct}%</strong>입니다.
      종합 적합도 <strong>${coreFit1.pct}%</strong>로 ${coreFit1.quadrant?.desc || '적합한 직무'}입니다.
    </div>
  </div>

  <div class="pg-foot"><span>FACE Career Report</span><span></span></div>
</div>`;
    h = h.replace('<!-- CORE_FIT_1_PLACEHOLDER -->', coreFit1Page);
  }

  // ─── Capacity: Job Map (lines 1098-1148) ───
  // Sweet spot jobs
  const sweetJobs = jobFits.filter((j: any) => j.quadrant.code === 'sweet_spot').slice(0, 4);
  const acquiredJobs = jobFits.filter((j: any) => j.quadrant.code === 'acquired_str').slice(0, 4);
  const potentialJobs = jobFits.filter((j: any) => j.quadrant.code === 'potential').slice(0, 4);
  const notFitJobs = jobFits.filter((j: any) => j.quadrant.code === 'not_fit').slice(0, 3);

  // 직무 지도 2×2 동적 생성
  const makeJobTags = (jobs: any[], tagClass: string) =>
    jobs.length > 0
      ? jobs.map((j: any) => `<div><span class="tag ${tagClass}">${j.job} ${j.pct}%</span></div>`).join('\n      ')
      : '<div class="t-small" style="color:#94A3B8;">해당 없음</div>';

  const jobMapHtml = `
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:3px; border-radius:16px; overflow:hidden; margin-bottom:20px;">
    <div class="p-lg" style="background:#F0FDF4;">
      <div style="font-size:14pt; font-weight:900; color:#15803D; margin-bottom:4px;">🟢 Sweet Spot</div>
      <div class="t-small mb-sm" style="color:#166534;">자연스럽고 잘하는 직무</div>
      ${makeJobTags(sweetJobs, 'tag-co')}
      <div class="mt-sm t-small" style="color:#166534;">→ 지금 바로 도전할 수 있는 직무</div>
    </div>
    <div class="p-lg" style="background:#FFFBEB;">
      <div style="font-size:14pt; font-weight:900; color:#854D0E; margin-bottom:4px;">🟡 후천적 강점</div>
      <div class="t-small mb-sm" style="color:#92400E;">잘하지만 에너지 소모 큰 직무</div>
      ${makeJobTags(acquiredJobs, 'tag-warn')}
      <div class="mt-sm t-small" style="color:#92400E;">⚠ 잘할 수 있지만 장기적으로<br>소진 위험이 있습니다</div>
    </div>
    <div class="p-lg" style="background:#EFF6FF;">
      <div style="font-size:14pt; font-weight:900; color:#1E40AF; margin-bottom:4px;">🔵 잠재력</div>
      <div class="t-small mb-sm" style="color:#1D4ED8;">나답지만 아직 개발 필요한 직무</div>
      ${makeJobTags(potentialJobs, 'tag-su')}
      <div class="mt-sm t-small" style="color:#1D4ED8;">→ 나다움 역량이라 개발하면<br>&nbsp;&nbsp;&nbsp;빠르게 성장 (Expandable)</div>
    </div>
    <div class="p-lg" style="background:#F8FAFC;">
      <div style="font-size:14pt; font-weight:900; color:#94A3B8; margin-bottom:4px;">🔴 비추천</div>
      <div class="t-small mb-sm" style="color:#94A3B8;">맞지 않는 직무</div>
      ${makeJobTags(notFitJobs, 'tag-muted')}
      <div class="mt-sm t-small" style="color:#94A3B8;">→ 나다움도 역량도 맞지 않아<br>&nbsp;&nbsp;&nbsp;피하는 것이 현명합니다</div>
    </div>
  </div>`;

  h = h.replace(/<!-- JOB_MAP_PLACEHOLDER -->/, jobMapHtml);

  // ─── Capacity: 나다운 역량 분석 동적 생성 ───
  const nadaumCompsList = allScored.filter((c: any) => c.nadaum.level === 'nadaum');
  const halfNadaumCompsList = allScored.filter((c: any) => c.nadaum.level === 'half_nadaum');
  const nonNadaumBottom3 = [...allScored].filter((c: any) => c.nadaum.level === 'non_nadaum').sort((a: any, b: any) => a.score - b.score).slice(0, 3);
  const foundationComps = [
    { name: COMP_NAMES['Fd1'] || '커뮤니케이션', score: r.scaled['Fd1'] || 25 },
    { name: COMP_NAMES['Fd2'] || '문제해결력', score: r.scaled['Fd2'] || 25 },
  ];

  const makeCompBar = (name: string, score: number, color: string, nameColor?: string) =>
    `<div class="bar" style="margin-bottom:7px;"><div class="bar-top"><span class="bar-name"${nameColor ? ` style="color:${nameColor};"` : ''}>${name}</span><span class="bar-score" style="color:${color};">${score}</span></div><div class="bar-track" style="height:8px;"><div class="bar-fill" style="width:${score}%; background:${color}; border-radius:4px;"></div></div></div>`;

  const nadaumBars = nadaumCompsList.map((c: any) => {
    const barColor = c.score >= 70 ? 'var(--co)' : c.score >= 50 ? '#86EFAC' : '#BBF7D0';
    return makeCompBar(c.name, c.score, barColor);
  }).join('\n    ');

  const halfNadaumBars = halfNadaumCompsList.slice(0, 5).map((c: any) => {
    const barColor = c.score >= 70 ? '#EAB308' : c.score >= 50 ? '#FDE68A' : '#FEF9C3';
    return makeCompBar(c.name, c.score, barColor);
  }).join('\n    ');

  const nonNadaumBars = nonNadaumBottom3.map((c: any) =>
    makeCompBar(c.name, c.score, 'var(--bad)', '#64748B')
  ).join('\n    ');

  const foundationBars = foundationComps.map(c => {
    const barColor = c.score >= 70 ? 'var(--co)' : '#86EFAC';
    return makeCompBar(c.name, c.score, barColor);
  }).join('\n    ');

  const competencyPage = `
<div class="page" style="padding-top:22mm;">
  <div class="pg-head"><span class="fc-su" style="font-weight:700;">C</span><span>나의 역량 — 나다움 분석</span></div>
  <div class="t-h2 mb-xs">나의 역량</div>
  <div class="t-body mb-md" style="font-size:11pt;">30개 전문역량을 <strong>${pt?.korean}</strong> 유형 기준으로 분류했습니다. 나다운 역량은 에너지가 덜 들고, 非나다운 역량은 에너지가 더 듭니다.</div>

  <!-- 나다운 + 확장 나다움 (좌/우) -->
  <div class="grid-2 gap-sm mb-sm">
    <div class="card" style="border-left:4px solid var(--co); background:#F0FDF4; padding:14px 16px;">
      <div style="font-size:12pt; font-weight:800; color:#15803D; margin-bottom:4px;">🟢 나다운 역량</div>
      <div class="t-small mb-sm" style="color:#166534;">${pt?.korean} 주기능 · ${nadaumCompsList.length}개</div>
      ${nadaumBars}
    </div>
    ${halfNadaumCompsList.length > 0 ? `<div class="card" style="border-left:4px solid #EAB308; background:#FFFBEB; padding:14px 16px;">
      <div style="font-size:12pt; font-weight:800; color:#854D0E; margin-bottom:4px;">🟡 확장 나다움</div>
      <div class="t-small mb-sm" style="color:#92400E;">${st?.korean} 부기능 · ${halfNadaumCompsList.length}개</div>
      ${halfNadaumBars}
    </div>` : '<div></div>'}
  </div>

  <!-- 非나다운 + 기초역량 (좌/우) -->
  <div class="grid-2 gap-sm mb-sm">
    <div class="card" style="border-left:4px solid var(--bad); background:#FEF2F2; padding:14px 16px;">
      <div style="font-size:12pt; font-weight:800; color:#991B1B; margin-bottom:4px;">🔴 非나다운 하위</div>
      <div class="t-small mb-sm" style="color:#991B1B;">에너지 소모가 큰 역량</div>
      ${nonNadaumBars}
    </div>
    <div class="card" style="border-left:4px solid #94A3B8; padding:14px 16px;">
      <div style="font-size:12pt; font-weight:800; color:#475569; margin-bottom:4px;">📋 기초역량</div>
      <div class="t-small mb-sm" style="color:#64748B;">모든 직무의 기본기</div>
      ${foundationBars}
    </div>
  </div>

  <!-- 읽는 법 -->
  <div class="card" style="background:#F8FAFC; padding:12px 16px;">
    <div class="t-body" style="font-size:10.5pt; line-height:1.7;">
      <strong style="color:var(--co);">🟢 나다운 역량</strong>은 ${pt?.korean}이 자연스럽게 집중하는 역량입니다.<br>
      <strong style="color:#EAB308;">🟡 확장 나다움</strong>은 ${st?.korean}(부기능)에서 오는 익숙한 역량입니다.<br>
      <strong style="color:var(--bad);">🔴 非나다운 역량</strong>은 잘할 수 있지만 에너지가 더 들어, 장기적으로 소진 위험이 있습니다.
    </div>
  </div>

  <div class="pg-foot"><span>FACE Career Report</span><span></span></div>
</div>`;

  h = h.replace(/<!-- COMPETENCY_ANALYSIS_PLACEHOLDER -->/, competencyPage);

  // ─── 강점 TOP 5 + 성장 포인트 동적 생성 ───
  const top5Comps = allScored.slice(0, 5);

  // Core Fit TOP 1 직무의 핵심 역량 중 60점 미만인 것 = 성장 포인트
  const coreFit1Job = coreJobs[0];
  let growthPoints: any[] = [];
  if (coreFit1Job) {
    const jobMapping = JOB_COMPETENCY_MAPPING.find(j => j.job === coreFit1Job.job);
    if (jobMapping) {
      growthPoints = jobMapping.comps
        .filter(code => code !== 'Fd1' && code !== 'Fd2')
        .map(code => ({
          code, name: COMP_NAMES[code] || code,
          score: r.scaled[code] || 25,
          nadaum: calcNadaumLevel(code, r.focusTypeName, r.focusSecondaryName),
        }))
        .filter(c => c.score < 60)
        .sort((a, b) => a.score - b.score)
        .slice(0, 4);
    }
  }

  // 강점 TOP 5 카드
  const strengthCards = top5Comps.map((c: any, i: number) => {
    const isFoundation = c.code === 'Fd1' || c.code === 'Fd2';
    const nadaumTag = isFoundation ? '<span class="tag tag-muted" style="font-size:8pt;">기초</span>'
      : c.nadaum.level === 'nadaum' ? '<span class="tag tag-co" style="font-size:8pt;">🟢 나다움</span>'
      : c.nadaum.level === 'half_nadaum' ? '<span class="tag tag-warn" style="font-size:8pt;">🟡 확장</span>'
      : '<span class="tag tag-bad" style="font-size:8pt;">🔴 非나다움</span>';
    const borderColor = c.score >= 70 ? 'var(--co)' : '#86EFAC';
    const scoreColor = c.score >= 70 ? 'var(--co)' : '#1E293B';
    return `<div class="card mb-sm" style="border-left:5px solid ${borderColor}; ${c.score >= 70 ? 'background:#F0FDF4;' : ''}">
    <div class="flex justify-between items-center mb-xs">
      <div><span style="font-size:14pt; font-weight:900; color:${scoreColor};">${i + 1}</span> &nbsp;<span class="t-h4">${c.name}</span> ${nadaumTag}</div>
      <div style="font-size:20pt; font-weight:900; color:${scoreColor};">${c.score}</div>
    </div>
  </div>`;
  }).join('\n  ');

  // 성장 포인트 카드
  const growthCards = growthPoints.map((c: any) => {
    const target = c.score < 50 ? 60 : 70;
    const nadaumTag = c.nadaum.level === 'nadaum' ? '🟢 나다움'
      : c.nadaum.level === 'half_nadaum' ? '🟡 확장 나다움'
      : '🔴 非나다움';
    const tagClass = c.nadaum.level === 'nadaum' ? 'tag-co' : c.nadaum.level === 'half_nadaum' ? 'tag-warn' : 'tag-bad';
    return `<div class="card mb-sm" style="border-left:5px solid #EAB308; background:#FFFBEB;">
    <div class="flex justify-between items-center mb-xs">
      <div><span class="t-h4">${c.name}</span> <span class="tag ${tagClass}" style="font-size:8pt;">${nadaumTag}</span></div>
      <div><span style="font-size:18pt; font-weight:900; color:#854D0E;">${c.score}</span> <span class="t-small">→ 목표 ${target}</span></div>
    </div>
    <div class="t-body" style="font-size:11pt;">${coreFit1Job?.job || 'Core Fit 직무'}에 필요한 역량입니다. ${c.nadaum.level === 'nadaum' ? '나다운 역량인데 점수가 낮다면, 지금 환경에서 이 역량을 쓸 기회가 적었다는 뜻입니다. 적성이 없는 게 아니라 경험이 부족한 것이니, 의식적으로 이 역량을 쓰는 환경을 만들면 가장 빠르게 성장합니다.' : c.nadaum.level === 'half_nadaum' ? '확장 나다움 역량이라 적절한 경험을 쌓으면 자연스럽게 개발 가능합니다.' : '非나다운 역량이라 의식적 노력이 필요하지만, Core Fit 직무에 필요하다면 우선 개발하세요.'}</div>
  </div>`;
  }).join('\n  ');

  const strengthGrowthPages = `
<!-- 강점 TOP 5 -->
<div class="page" style="padding-top:22mm;">
  <div class="pg-head"><span class="fc-su" style="font-weight:700;">C</span><span>나의 강점과 성장 — TOP 5 강점</span></div>
  <div class="t-h2 mb-md">강점 TOP 5</div>
  ${strengthCards}
  <div class="pg-foot"><span>FACE Career Report</span><span></span></div>
</div>

<!-- 성장 포인트 -->
<div class="page" style="padding-top:22mm;">
  <div class="pg-head"><span class="fc-su" style="font-weight:700;">C</span><span>나의 강점과 성장 — 성장 포인트</span></div>
  <div class="t-h2 mb-xs">성장 포인트</div>
  <div class="t-body mb-md">${coreFit1Job?.job || 'Core Fit 직무'}에 필요한데 아직 기준(60점)에 못 미치는 역량입니다. 나다운 역량부터 개발하면 투자 대비 효과가 큽니다.</div>
  ${growthCards.length > 0 ? growthCards : '<div class="card" style="background:#F0FDF4; text-align:center; padding:20px;"><div class="t-body" style="color:#166534;">모든 핵심 역량이 60점 이상입니다. 지금 바로 도전하세요!</div></div>'}

  <div class="card" style="background:#F0FDF4; border:1.5px solid #BBF7D0; margin-top:12px;">
    <div class="t-body text-center" style="font-size:11.5pt; color:#166534;">
      <strong>개발 우선순위: Core Fit 직무에 필요한 역량부터 집중하세요.</strong><br>
      나다운 역량(🟢)은 경험만 쌓이면 빠르게 올라가고, 非나다운 역량(🔴)은 의식적 노력이 더 필요합니다.
    </div>
  </div>

  <div class="pg-foot"><span>FACE Career Report</span><span></span></div>
</div>

` + buildAcquiredAnalysisPage(jobFits, r, coreJobs, COMP_NAMES, calcNadaumLevel, JOB_COMPETENCY_MAPPING);

  h = h.replace(/<!-- STRENGTH_GROWTH_PLACEHOLDER -->/, strengthGrowthPages);

  // ─── F×A×C 브릿지 (다크) — Capacity 종합 ───
  const facBridge = `
<div class="page bg-dark" style="padding-top:18mm;">
  <div class="pg-head"><span style="color:var(--co); font-weight:700;">F</span><span style="color:#94A3B8;">×</span><span style="color:var(--cr); font-weight:700;">A</span><span style="color:#94A3B8;">×</span><span style="color:var(--su); font-weight:700;">C</span><span style="color:#94A3B8;">&nbsp;&nbsp;종합 커리어 추천</span></div>

  <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
    <div style="width:36px; height:36px; border-radius:50%; background:var(--co); display:flex; align-items:center; justify-content:center; font-size:14pt; font-weight:900; color:white;">F</div>
    <div style="font-size:13pt; color:#94A3B8;">×</div>
    <div style="width:36px; height:36px; border-radius:50%; background:var(--cr); display:flex; align-items:center; justify-content:center; font-size:14pt; font-weight:900; color:white;">A</div>
    <div style="font-size:13pt; color:#94A3B8;">×</div>
    <div style="width:36px; height:36px; border-radius:50%; background:var(--su); display:flex; align-items:center; justify-content:center; font-size:14pt; font-weight:900; color:white;">C</div>
  </div>

  <div style="font-size:19pt; font-weight:900; color:white; line-height:1.3; margin-bottom:12px;">
    ${pt?.korean}의 방향,<br>${anchorAll[0].def?.korean}의 가치,<br>${coreJobs[0]?.job || '추천 직무'}의 역량이<br>만나는 곳
  </div>

  <div style="font-size:12pt; font-weight:700; color:white; margin-bottom:8px;">당신의 커리어 공식</div>

  <div style="background:#1E293B; border-radius:10px; padding:12px 16px; margin-bottom:12px;">
    <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
      <span style="font-size:11pt; font-weight:900; color:var(--co);">F</span>
      <span style="font-size:10.5pt; color:#CBD5E1;">${pt?.korean} — ${pt?.desc}</span>
    </div>
    <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
      <span style="font-size:11pt; font-weight:900; color:var(--cr);">A</span>
      <span style="font-size:10.5pt; color:#CBD5E1;">${anchorAll[0].def?.korean} × ${anchorAll[1].def?.korean} → ${topOrgName}</span>
    </div>
    <div style="display:flex; gap:10px; align-items:center;">
      <span style="font-size:11pt; font-weight:900; color:var(--su);">C</span>
      <span style="font-size:10.5pt; color:#CBD5E1;">Core Fit: ${coreJobs.map((j: any) => j.job).join(', ')}</span>
    </div>
  </div>

  <div style="font-size:12pt; font-weight:700; color:white; margin-bottom:8px;">최종 추천</div>

  <div class="grid-3" style="gap:6px; margin-bottom:12px;">
    ${coreJobs.map((j: any, i: number) => {
      const colors = ['var(--co)', 'var(--cr)', 'var(--su)'];
      return '<div style="background:#1E293B; border-radius:8px; border-top:3px solid ' + colors[i] + '; text-align:center; padding:10px 8px;">'
        + '<div style="font-size:20pt; font-weight:900; color:white; margin-bottom:2px;">' + j.pct + '</div>'
        + '<div style="font-size:10.5pt; font-weight:700; color:white;">' + j.job + '</div>'
        + '<div style="font-size:8.5pt; color:#64748B; margin-top:2px;">' + j.category + '</div>'
        + '<div style="margin-top:4px;"><span style="font-size:7.5pt; background:#334155; color:#CBD5E1; padding:2px 6px; border-radius:4px;">' + j.quadrant.label + '</span></div>'
        + '</div>';
    }).join('\n    ')}
  </div>

  ${(() => {
    const topInterest = r.interestSorted?.[0]?.[0] || 'tech';
    const topOrgKey = catMatches[0]?.category || 'startup';
    const intData = INTEREST_DATA[topInterest];
    const orgCell = intData?.orgs[topOrgKey];
    const companies = orgCell?.companies || '';
    const secondOrgKey = catMatches[1]?.category || 'foreign_corp';
    const secondOrgCell = intData?.orgs[secondOrgKey];
    const secondCompanies = secondOrgCell?.companies || '';

    return '<div style="background:#1E293B; border-radius:10px; padding:12px 14px; margin-bottom:12px;">'
      + '<div style="font-size:11pt; font-weight:700; color:white; margin-bottom:8px;">🏢 추천 기업</div>'
      + '<div style="margin-bottom:6px;">'
      + '<div style="font-size:9.5pt; font-weight:700; color:var(--co); margin-bottom:2px;">' + (catMatches[0]?.korean || '') + ' × ' + (intData?.korean || '') + '</div>'
      + '<div style="font-size:9.5pt; color:#94A3B8; line-height:1.6;">' + companies + '</div>'
      + '</div>'
      + (secondCompanies ? '<div>'
        + '<div style="font-size:9.5pt; font-weight:700; color:var(--su); margin-bottom:2px;">' + (catMatches[1]?.korean || '') + ' × ' + (intData?.korean || '') + '</div>'
        + '<div style="font-size:9.5pt; color:#94A3B8; line-height:1.6;">' + secondCompanies + '</div>'
        + '</div>' : '')
      + '</div>';
  })()}

  <div style="margin-bottom:20px;">
    <div style="background:var(--co); border-radius:8px; padding:8px 16px; font-size:10.5pt; font-weight:700; color:white; text-align:center;">${topOrgName}의 ${coreJobs[0]?.job || '추천 직무'}에서 시작하세요</div>
  </div>

  <!-- 다음 챕터 연결 -->
  <div style="background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:12px 18px; display:flex; align-items:center; gap:14px;">
    <div style="width:36px; height:36px; border-radius:50%; background:rgba(139,92,246,.3); display:flex; align-items:center; justify-content:center; font-size:15pt; font-weight:900; color:#C4B5FD; flex-shrink:0;">E</div>
    <div>
      <div style="font-size:9pt; color:#64748B; margin-bottom:2px;">다음 챕터</div>
      <div style="font-size:11pt; font-weight:700; color:white;">Energy — 지금 움직일 준비가 되어 있는가</div>
      <div style="font-size:9pt; color:#64748B; margin-top:2px;">동기충족도 · 행동전환도 · 몰입도 + 성장단계 진단</div>
    </div>
  </div>

  <div class="pg-foot"><span>FACE Career Report</span><span></span></div>
</div>`;

  h = h.replace(/<!-- FAC_BRIDGE_PLACEHOLDER -->/, facBridge);

  // ─── 희망직무 적합도 페이지 (desiredJob이 있을 때만) ───
  if (r.desiredJob) {
    const [desiredCat, desiredJobName] = r.desiredJob.split('|');
    const desiredJobMapping = JOB_COMPETENCY_MAPPING.find(j => j.job === desiredJobName);
    if (desiredJobMapping && desiredJobName) {
      const desiredFit = calcJobFit(r.scaled, r.focusTypeName, desiredJobMapping.comps, r.focusSecondaryName);

      // F 분석: 나다움 비율
      const desiredComps = desiredJobMapping.comps.filter((c: string) => c !== 'Fd1' && c !== 'Fd2');
      const nadaumInDesired = desiredComps.filter((c: string) => {
        const n = calcNadaumLevel(c, r.focusTypeName, r.focusSecondaryName);
        return n.level === 'nadaum' || n.level === 'half_nadaum';
      });
      const focusMatch = Math.round(nadaumInDesired.length / desiredComps.length * 100);

      // A 분석: 해당 직무 카테고리와 조직 매칭
      const catRank = catMatches.findIndex((c: any) => {
        const catJobs = JOB_COMPETENCY_MAPPING.filter(j => j.category === desiredCat);
        return catJobs.length > 0;
      });

      // C 분석: 역량별 상세
      const desiredCompDetail = desiredJobMapping.comps.map((code: string, i: number) => {
        const isFoundation = code === 'Fd1' || code === 'Fd2';
        const score = r.scaled[code] || 25;
        const nadaum = calcNadaumLevel(code, r.focusTypeName, r.focusSecondaryName);
        return { code, name: COMP_NAMES[code] || code, score, nadaum, isFoundation, rank: i + 1 };
      });
      const weakComps = desiredCompDetail.filter((c: any) => !c.isFoundation && c.score < 60);

      const fColor = focusMatch >= 50 ? '#22C55E' : focusMatch >= 30 ? '#EAB308' : '#EF4444';
      const fLabel = focusMatch >= 50 ? '높음' : focusMatch >= 30 ? '보통' : '낮음';
      const cColor = desiredFit.pct >= 70 ? '#22C55E' : desiredFit.pct >= 50 ? '#EAB308' : '#EF4444';

      const desiredJobPage = `
<div class="page" style="padding-top:22mm;">
  <div class="pg-head"><span class="fc-su" style="font-weight:700;">C</span><span>희망직무 적합도 분석</span></div>
  <div class="t-h2 mb-xs">희망직무: ${desiredJobName}</div>
  <div class="t-body mb-md">${userName}님이 선택한 <strong>${desiredJobName}</strong>(${desiredCat})에 대한 F·A·C 종합 분석입니다.</div>

  <div class="grid-3 gap-sm mb-md">
    <div class="card text-center" style="border-top:4px solid ${fColor};">
      <div class="t-label mb-xs" style="color:${fColor};">F — 나다움</div>
      <div style="font-size:28pt; font-weight:900; color:${fColor};">${focusMatch}%</div>
      <div class="t-small mt-xs">${fLabel}</div>
      <div class="t-small" style="color:#64748B;">${nadaumInDesired.length}/${desiredComps.length} 역량이<br>나다움 영역</div>
    </div>
    <div class="card text-center" style="border-top:4px solid var(--cr);">
      <div class="t-label mb-xs" style="color:var(--cr);">A — 조직 매칭</div>
      <div style="font-size:28pt; font-weight:900; color:var(--cr);">${catMatches[0]?.similarity || 0}%</div>
      <div class="t-small mt-xs">${catMatches[0]?.korean || ''}</div>
      <div class="t-small" style="color:#64748B;">가치관 기준<br>추천 조직 1위</div>
    </div>
    <div class="card text-center" style="border-top:4px solid ${cColor};">
      <div class="t-label mb-xs" style="color:${cColor};">C — 역량 적합도</div>
      <div style="font-size:28pt; font-weight:900; color:${cColor};">${desiredFit.pct}%</div>
      <div class="t-small mt-xs">${desiredFit.level}</div>
      <div class="t-small" style="color:#64748B;">${desiredFit.quadrant.label}</div>
    </div>
  </div>

  <div class="t-h4 mb-sm">📊 ${desiredJobName} 핵심 역량 8개</div>
  <div class="card mb-sm" style="padding:14px 18px;">
    ${desiredCompDetail.map((c: any) => {
      const barColor = c.nadaum.level === 'nadaum' ? 'var(--co)' : c.nadaum.level === 'half_nadaum' ? '#EAB308' : c.score >= 60 ? '#94A3B8' : 'var(--bad)';
      const tag = c.isFoundation ? '<span class="tag tag-muted" style="font-size:7pt;">기초</span>'
        : c.nadaum.level === 'nadaum' ? '<span class="tag tag-co" style="font-size:7pt;">나다움</span>'
        : c.nadaum.level === 'half_nadaum' ? '<span class="tag tag-warn" style="font-size:7pt;">확장</span>'
        : c.score < 60 ? '<span class="tag tag-bad" style="font-size:7pt;">부족</span>' : '';
      return '<div class="bar" style="margin-bottom:5px;"><div class="bar-top"><span class="bar-name" style="font-size:10pt; flex:1; min-width:0;">' + c.name + ' ' + tag + '</span><span class="bar-score" style="font-size:10pt; color:' + barColor + '; white-space:nowrap; min-width:24px; text-align:right;">' + c.score + '</span></div><div class="bar-track" style="height:7px; overflow:hidden;"><div class="bar-fill" style="width:' + Math.min(c.score, 100) + '%; max-width:100%; background:' + barColor + '; border-radius:4px;"></div></div></div>';
    }).join('\n    ')}
  </div>

  ${weakComps.length > 0 ? '<div class="card" style="background:#FFFBEB; border:1.5px solid #FDE68A; padding:14px 18px;">'
    + '<div class="t-h4 mb-xs" style="color:#92400E;">💡 ' + desiredJobName + '을 위해 키워야 할 역량</div>'
    + weakComps.map((c: any) => '<div style="font-size:11pt; color:#854D0E; margin-bottom:3px;">' + c.nadaum.emoji + ' ' + c.name + ' <strong>' + c.score + '</strong> → 목표 60 '
      + (c.nadaum.level === 'nadaum' ? '(나다움이라 빠르게 성장 가능)' : c.nadaum.level === 'half_nadaum' ? '(확장 나다움, 개발 가능)' : '(의식적 노력 필요)')
      + '</div>').join('')
    + '</div>' : '<div class="card" style="background:#F0FDF4; border:1.5px solid #BBF7D0; padding:14px 18px;"><div class="t-body text-center" style="color:#166534;">모든 핵심 역량이 60점 이상! ' + desiredJobName + '에 바로 도전할 수 있습니다.</div></div>'}

  <div class="pg-foot"><span>FACE Career Report</span><span></span></div>
</div>`;

      // FAC 브릿지 뒤에 삽입
      h = h.replace(/<!-- FAC_BRIDGE_PLACEHOLDER_AFTER -->/, desiredJobPage);
      // 실제로는 FAC 브릿지 앞에 삽입 (Capacity 섹션 내)
      h = h.replace(facBridge, desiredJobPage + '\n' + facBridge);
    }
  }

  // ─── Organization matches — 동적 페이지 생성 (Anchor 섹션으로 이동) ───
  const makeOrgBar = (c: any, i: number) => {
    const barColor = i === 0 ? 'var(--co)' : i === 1 ? 'var(--su)' : i === 2 ? '#8B5CF6' : '#CBD5E1';
    const scoreClass = i === 0 ? 'fc-co' : i === 1 ? 'fc-su' : '';
    const scoreStyle = i > 1 ? ' style="color:var(--muted);"' : '';
    return `<div class="bar" style="margin-bottom:7px;"><div class="bar-top"><span class="bar-name" style="font-size:10.5pt;">${c.korean}</span><span class="bar-score ${scoreClass}"${scoreStyle} style="font-size:10.5pt;">${c.similarity}%</span></div><div class="bar-track" style="height:7px;"><div class="bar-fill" style="width:${c.similarity}%; background:${barColor}; border-radius:4px;"></div></div></div>`;
  };
  const orgBarsLeft = catMatches.slice(0, 5).map((c: any, i: number) => makeOrgBar(c, i)).join('\n      ');
  const orgBarsRight = catMatches.slice(5).map((c: any, i: number) => makeOrgBar(c, i + 5)).join('\n      ');
  const orgBarsHtml = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:0 24px;">
    <div>${orgBarsLeft}</div>
    <div>${orgBarsRight}</div>
  </div>`;

  // Top 2 org detail cards (풍성한 버전)
  const orgTop2Html = catMatches.slice(0, 2).map((c: any, i: number) => {
    const orgInterp = (ORG_TYPE_INTERPRETATIONS as any)?.[c.category];
    const borderColor = i === 0 ? 'var(--co)' : 'var(--su)';
    const bgColor = i === 0 ? '#F0FDF4' : '#EFF6FF';
    const labelColor = i === 0 ? '#166534' : '#1E40AF';
    const label = i === 0 ? '1순위 추천' : '2순위 추천';
    return `<div class="card mb-sm" style="border-left:5px solid ${borderColor}; background:${bgColor}; padding:16px 18px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <div style="font-size:15pt; font-weight:900; color:#1E293B;">${c.korean}</div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:9pt; font-weight:700; color:${labelColor}; background:${borderColor}20; padding:2px 8px; border-radius:4px;">${label}</span>
          <span style="font-size:16pt; font-weight:900; color:${borderColor};">${c.similarity}%</span>
        </div>
      </div>
      <div style="font-size:11pt; color:#374151; line-height:1.7; margin-bottom:10px;">${orgInterp?.desc || `당신의 가치관과 ${c.similarity}% 일치하는 조직 유형입니다.`}</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
        <div style="background:#FFFFFF80; border-radius:8px; padding:8px 12px;">
          <div style="font-size:9pt; font-weight:700; color:#16A34A; margin-bottom:4px;">✓ 강점</div>
          <div style="font-size:10pt; color:#374151; line-height:1.6;">${orgInterp?.pros || '-'}</div>
        </div>
        <div style="background:#FFFFFF80; border-radius:8px; padding:8px 12px;">
          <div style="font-size:9pt; font-weight:700; color:#DC2626; margin-bottom:4px;">△ 고려사항</div>
          <div style="font-size:10pt; color:#374151; line-height:1.6;">${orgInterp?.cons || '-'}</div>
        </div>
      </div>
      <div style="font-size:9.5pt; color:#64748B; padding:6px 10px; background:#FFFFFF60; border-radius:6px;">🎯 ${orgInterp?.fitFor || ''}</div>
    </div>`;
  }).join('\n    ');

  // 1~3위 점수 기반 해석 문장
  const orgTop1 = catMatches[0];
  const orgTop2match = catMatches[1];
  const gap = orgTop1 && orgTop2match ? orgTop1.similarity - orgTop2match.similarity : 0;
  const orgIntroText = gap >= 10
    ? `${orgTop1?.korean}이 압도적으로 높습니다. 당신의 가치관이 이 조직 유형에 뚜렷하게 정렬되어 있습니다.`
    : gap >= 5
    ? `${orgTop1?.korean}이 가장 높지만, ${orgTop2match?.korean}도 근접합니다. 두 유형 모두를 진지하게 탐색해보세요.`
    : `${orgTop1?.korean}과 ${orgTop2match?.korean}이 거의 같은 수준입니다. 두 환경 중 어느 문화가 더 맞는지 직접 경험해보는 것이 중요합니다.`;

  const orgPage = `
<div class="page" style="padding-top:22mm;">
  <div class="pg-head"><span class="fc-cr" style="font-weight:700;">A</span><span>나에게 맞는 조직</span></div>
  <div class="t-h2 mb-xs">어떤 조직이 나와 맞을까?</div>
  <div class="t-body mb-xs">당신의 가치관(Anchor) 프로파일과 9개 기업 카테고리의 유사도를 비교했습니다.</div>
  <div class="t-body mb-md" style="color:var(--co); font-weight:600;">→ ${orgIntroText}</div>
  <div class="card mb-md" style="padding:16px 20px;">
    ${orgBarsHtml}
  </div>
  ${orgTop2Html}
  <div class="pg-foot"><span>FACE Career Report</span><span></span></div>
</div>`;

  h = h.replace(/<!-- ORG_MATCHING_PAGES_HERE -->/, orgPage);

  // ─── Energy 2페이지 동적 생성 ───
  const motivColor = energy.motivPct >= 70 ? 'var(--co)' : energy.motivPct >= 40 ? '#EAB308' : 'var(--bad)';
  const motivBg = energy.motivPct >= 70 ? '#F0FDF4' : energy.motivPct >= 40 ? '#FFFBEB' : '#FEF2F2';
  const motivFgColor = energy.motivPct >= 70 ? '#166534' : energy.motivPct >= 40 ? '#854D0E' : '#991B1B';
  const motivDesc = energy.motivPct >= 70
    ? '3가지 욕구가 충분히 채워지고 있습니다. 에너지가 잘 흐르는 상태예요.'
    : energy.motivPct >= 40
    ? '3가지 욕구 중 일부만 채워지고 있습니다. 지금 환경에서 어떤 욕구가 부족한지 점검해보세요.'
    : '기본 욕구가 많이 채워지지 않고 있습니다. 환경 변화나 자기 돌봄이 우선입니다.';

  const actionColor = energy.actionPct >= 50 ? 'var(--co)' : energy.actionPct >= 30 ? '#EAB308' : 'var(--bad)';
  const actionBg = energy.actionPct >= 50 ? '#F0FDF4' : energy.actionPct >= 30 ? '#FFFBEB' : '#FEF2F2';
  const actionFgColor = energy.actionPct >= 50 ? '#166534' : energy.actionPct >= 30 ? '#854D0E' : '#991B1B';
  const actionDesc = energy.actionPct >= 50
    ? '이미 행동으로 옮기고 있습니다! 실행력이 강점입니다.'
    : energy.actionPct >= 30
    ? '생각은 있지만 아직 구체적 행동으로 옮기지 못하고 있습니다. 작은 실행부터 시작하세요.'
    : '아직 행동으로 연결되지 않고 있습니다. 먼저 에너지를 회복하는 것이 중요합니다.';

  const engColor = energy.engagementPct >= 60 ? 'var(--ar)' : energy.engagementPct >= 40 ? '#EAB308' : 'var(--bad)';
  const engBg = energy.engagementPct >= 60 ? '#F5F3FF' : energy.engagementPct >= 40 ? '#FFFBEB' : '#FEF2F2';
  const engFgColor = energy.engagementPct >= 60 ? '#5B21B6' : energy.engagementPct >= 40 ? '#854D0E' : '#991B1B';
  const engDesc = energy.engagementPct >= 60
    ? '일에 대한 몰입도가 높습니다. 에너지가 잘 흐르고 있어요.'
    : energy.engagementPct >= 40
    ? '극도로 몰입하지도, 소진되지도 않은 상태입니다. 새로운 자극이 몰입도를 끌어올릴 수 있습니다.'
    : '몰입이 어렵거나 소진된 상태일 수 있습니다. 회복이 우선입니다.';

  const stageInterp = (ENERGY_STAGE_INTERPRETATIONS as any)?.[energy.stage];

  // 9칸 매트릭스에서 현재 위치 표시
  const stageMatrix = [
    ['성장활성기', '균형조율기', '잠재축적기'],
    ['전환가속기', '탐색진행기', '방향설정기'],
    ['돌파시도기', '에너지충전기', '기반구축기'],
  ];
  const matrixHtml = stageMatrix.map((row, ri) => {
    const rowLabel = ['충족', '부분충족', '미충족'][ri];
    const cells = row.map((stage, ci) => {
      const isCurrent = stage === energy.stage;
      const cellBg = ri === 0 ? (ci === 0 ? '#DCFCE7' : ci === 1 ? '#F0FDF4' : '#FFFBEB')
        : ri === 1 ? (ci === 0 ? '#FEF3C7' : ci === 1 ? '#FEF9C3' : '#FEE2E2')
        : (ci === 0 ? '#FFFBEB' : '#FEE2E2');
      return '<td style="padding:10px; background:' + cellBg + '; border-radius:8px;'
        + (isCurrent ? ' border:3px solid #F59E0B; font-weight:800; color:#92400E;">' + '● ' + stage : '">' + stage)
        + '</td>';
    }).join('');
    return '<tr><td style="font-weight:700; text-align:left;">' + rowLabel + '</td>' + cells + '</tr>';
  }).join('\n');

  const energyPages = `
<div class="page" style="padding-top:22mm;">
  <div class="pg-head"><span class="fc-ar" style="font-weight:700;">E</span><span>지금 나의 에너지</span></div>
  <div class="t-h2 mb-xs">지금 나의 에너지</div>
  <div class="t-body mb-md">아무리 좋은 방향을 찾아도, 지금 에너지가 없으면 움직일 수 없습니다. 3가지 지표로 당신의 마음 상태를 읽습니다.</div>

  <div class="card mb-xs" style="border-left:5px solid ${motivColor}; padding:12px 16px;">
    <div class="flex justify-between items-center" style="margin-bottom:6px;">
      <div class="t-h4" style="color:${motivFgColor};">동기충족도</div>
      <div style="font-size:20pt; font-weight:900; color:${motivColor};">${energy.motivPct}%</div>
    </div>
    <div class="bar-track" style="height:8px; margin-bottom:8px;"><div class="bar-fill" style="width:${energy.motivPct}%; background:${motivColor}; border-radius:4px;"></div></div>
    <div style="font-size:10.5pt; color:#334155; margin-bottom:5px;"><strong>정의:</strong> 일에서 자율성, 유능감, 관계성 — 3가지 기본 욕구가 얼마나 채워지고 있는지를 측정합니다.</div>
    <div class="rounded" style="background:${motivBg}; padding:8px 12px;"><div style="font-size:10.5pt; color:${motivFgColor};"><strong>${energy.motivPct}% = ${energy.motivLevel}.</strong> ${motivDesc}</div></div>
  </div>

  <div class="card mb-xs" style="border-left:5px solid ${actionColor}; padding:12px 16px;">
    <div class="flex justify-between items-center" style="margin-bottom:6px;">
      <div class="t-h4" style="color:${actionFgColor};">행동전환도</div>
      <div style="font-size:20pt; font-weight:900; color:${actionColor};">${energy.actionPct}%</div>
    </div>
    <div class="bar-track" style="height:8px; margin-bottom:8px;"><div class="bar-fill" style="width:${energy.actionPct}%; background:${actionColor}; border-radius:4px;"></div></div>
    <div style="font-size:10.5pt; color:#334155; margin-bottom:5px;"><strong>정의:</strong> 커리어 목표를 위해 실제로 행동하고 있는 정도. 자기계발, 이력서 준비, 네트워킹 등 구체적 행동 여부.</div>
    <div class="rounded" style="background:${actionBg}; padding:8px 12px;"><div style="font-size:10.5pt; color:${actionFgColor};"><strong>${energy.actionPct}% = ${energy.actionLevel}.</strong> ${actionDesc}</div></div>
  </div>

  <div class="card" style="border-left:5px solid ${engColor}; padding:12px 16px; margin-bottom:14px;">
    <div class="flex justify-between items-center" style="margin-bottom:6px;">
      <div class="t-h4" style="color:${engFgColor};">몰입도</div>
      <div style="font-size:20pt; font-weight:900; color:${engColor};">${energy.engagementPct}%</div>
    </div>
    <div class="bar-track" style="height:8px; margin-bottom:8px;"><div class="bar-fill" style="width:${energy.engagementPct}%; background:${engColor}; border-radius:4px;"></div></div>
    <div style="font-size:10.5pt; color:#334155; margin-bottom:5px;"><strong>정의:</strong> 일할 때 에너지가 넘치고 시간 가는 줄 모르는 상태. 소진(번아웃)의 조기 신호를 감지합니다.</div>
    <div class="rounded" style="background:${engBg}; padding:8px 12px;"><div style="font-size:10.5pt; color:${engFgColor};"><strong>${energy.engagementPct}%.</strong> ${engDesc}</div></div>
  </div>

  ${(() => {
    // 3지표 조합 해석
    const highMotiv = energy.motivPct >= 70;
    const highAction = energy.actionPct >= 70;
    const highEng = energy.engagementPct >= 60;
    const lowMotiv = energy.motivPct < 40;
    const lowAction = energy.actionPct < 40;
    const lowEng = energy.engagementPct < 40;

    let synthTitle = '';
    let synthDesc = '';
    let synthColor = 'var(--co)';
    let synthBg = '#F0FDF4';
    let needs: string[] = [];

    if (highMotiv && highAction && highEng) {
      synthTitle = '세 가지 모두 건강한 상태입니다';
      synthDesc = '동기, 행동, 몰입이 모두 높은 이상적인 에너지 상태입니다. 지금이 커리어 도약을 위한 최적의 타이밍입니다. 이 상태를 유지하면서 더 큰 목표에 도전하세요.';
      synthColor = 'var(--co)'; synthBg = '#F0FDF4';
      needs = ['도전적인 목표 설정', '현재 흐름 유지', '성과를 기록하는 습관'];
    } else if (highMotiv && highAction && !highEng) {
      synthTitle = '움직이고 있지만 몰입의 깊이를 높일 때입니다';
      synthDesc = '에너지와 행동은 충분하지만, 진정으로 몰입하는 경험이 아직 부족합니다. 지금 하는 일이 나다운 방식과 맞는지 점검이 필요합니다.';
      synthColor = '#EAB308'; synthBg = '#FFFBEB';
      needs = ['내가 진짜 즐기는 일 탐색', '집중 시간 블록 만들기', '루틴 실험'];
    } else if (highMotiv && !highAction) {
      synthTitle = '의욕은 있지만 행동으로 전환하는 연결이 필요합니다';
      synthDesc = '동기는 충분히 충전되어 있습니다. 이제 그 에너지를 구체적인 커리어 행동으로 옮기는 것이 핵심 과제입니다. 작은 행동 하나로 시작하세요.';
      synthColor = '#EAB308'; synthBg = '#FFFBEB';
      needs = ['작은 행동 목록 만들기', '첫 번째 행동 24시간 안에 실행', '행동 파트너 찾기'];
    } else if (!highMotiv && highAction) {
      synthTitle = '움직이고 있지만 연료 보충이 필요합니다';
      synthDesc = '행동은 활발하지만 동기충족도가 낮아 번아웃 위험이 있습니다. 지금 하는 행동이 자신에게 의미 있는지, 무엇이 고갈되고 있는지 점검하세요.';
      synthColor = '#EF4444'; synthBg = '#FEF2F2';
      needs = ['번아웃 신호 점검', '자율성/관계성 회복', '쉬는 것도 전략임을 인식'];
    } else if (lowMotiv && lowAction && lowEng) {
      synthTitle = '지금은 회복이 우선입니다';
      synthDesc = '세 가지 지표 모두 낮은 상태입니다. 지금은 방향 탐색보다 에너지 회복이 먼저입니다. 작은 성취를 쌓고, 주변 지지를 받는 것이 중요합니다.';
      synthColor = '#EF4444'; synthBg = '#FEF2F2';
      needs = ['하루 루틴 안정화', '신뢰할 수 있는 사람과 대화', '자기 돌봄 우선'];
    } else {
      synthTitle = '불균형한 에너지 — 조율이 필요한 시점입니다';
      synthDesc = '세 가지 지표가 고르지 않습니다. 높은 지표의 흐름을 살리면서, 낮은 지표를 회복하는 균형 전략이 필요합니다.';
      synthColor = '#EAB308'; synthBg = '#FFFBEB';
      needs = ['지표별 원인 파악', '한 가지씩 개선', '환경 조건 점검'];
    }

    const needsHtml = needs.map(n => `<div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;"><div style="width:6px; height:6px; border-radius:50%; background:${synthColor}; flex-shrink:0;"></div><span style="font-size:10.5pt; color:#374151;">${n}</span></div>`).join('');

    return `<div style="background:${synthBg}; border-radius:12px; padding:16px 20px; border:1.5px solid ${synthColor}40;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
        <div style="width:8px; height:8px; border-radius:50%; background:${synthColor};"></div>
        <div style="font-size:11pt; font-weight:800; color:#0F172A;">3가지 지표 종합 해석</div>
      </div>
      <div style="font-size:11pt; font-weight:700; color:${synthColor}; margin-bottom:6px;">${synthTitle}</div>
      <div style="font-size:10.5pt; color:#374151; line-height:1.75; margin-bottom:12px;">${synthDesc}</div>
      <div style="font-size:10pt; font-weight:700; color:#64748B; margin-bottom:6px; letter-spacing:.5px;">지금 나에게 필요한 것</div>
      ${needsHtml}
    </div>`;
  })()}

  <div style="margin-bottom:28px;"></div>
  <div class="pg-foot"><span>FACE Career Report</span><span></span></div>
</div>

<div class="page" style="padding-top:20mm;">
  <div class="pg-head"><span class="fc-ar" style="font-weight:700;">E</span><span>지금 나의 에너지 — 종합</span></div>

  <!-- 단계 배지 + 제목 -->
  <div style="display:flex; align-items:center; gap:16px; margin-bottom:16px;">
    <div style="flex-shrink:0; width:64px; height:64px; border-radius:50%; background:${energyBg}; display:flex; align-items:center; justify-content:center; font-size:28pt;">${energyEmoji}</div>
    <div>
      <div style="font-size:9.5pt; font-weight:700; color:#64748B; letter-spacing:1px; margin-bottom:2px;">${energyLabel} 단계</div>
      <div style="font-size:22pt; font-weight:900; color:#0F172A; line-height:1.1;">${energy.stage}</div>
      <div style="font-size:11pt; font-weight:600; color:${energyFg}; margin-top:4px;">${stageInterp?.title || '지금 단계에 맞는 전략이 필요합니다'}</div>
    </div>
  </div>

  <div style="font-size:11pt; color:#334155; line-height:1.8; margin-bottom:16px; padding:14px 18px; background:#F8FAFC; border-radius:10px; border-left:4px solid ${energyFg};">
    ${stageInterp?.desc || '동기와 행동 수준을 함께 고려한 현재 커리어 에너지 상태입니다.'}
  </div>

  <!-- 매트릭스 -->
  <div class="card mb-md" style="padding:14px 16px;">
    <div style="font-size:10.5pt; font-weight:700; text-align:center; margin-bottom:10px; color:#475569;">성장단계 매트릭스 — 동기 × 행동</div>
    <table style="width:100%; border-collapse:separate; border-spacing:3px; font-size:10pt; text-align:center;">
      <tr><td style="width:20%;"></td><td style="padding:6px; font-weight:700; color:#64748B;">행동 높음</td><td style="padding:6px; font-weight:700; color:#64748B;">행동 보통</td><td style="padding:6px; font-weight:700; color:#64748B;">행동 낮음</td></tr>
      ${matrixHtml}
    </table>
    <div style="font-size:8.5pt; text-align:center; color:var(--muted); margin-top:6px;">가로축 = 실제로 행동하고 있는가 | 세로축 = 동기가 충족되고 있는가</div>
  </div>

  <!-- 3개 지표 요약 바 -->
  <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:16px;">
    <div style="text-align:center; background:#F8FAFC; border-radius:10px; padding:10px 8px;">
      <div style="font-size:9pt; font-weight:700; color:#64748B; margin-bottom:4px;">동기충족도</div>
      <div style="font-size:18pt; font-weight:900; color:${motivColor};">${energy.motivPct}%</div>
      <div style="font-size:8.5pt; color:${motivFgColor};">${energy.motivLevel}</div>
    </div>
    <div style="text-align:center; background:#F8FAFC; border-radius:10px; padding:10px 8px;">
      <div style="font-size:9pt; font-weight:700; color:#64748B; margin-bottom:4px;">행동전환도</div>
      <div style="font-size:18pt; font-weight:900; color:${actionColor};">${energy.actionPct}%</div>
      <div style="font-size:8.5pt; color:${actionFgColor};">${energy.actionLevel}</div>
    </div>
    <div style="text-align:center; background:#F8FAFC; border-radius:10px; padding:10px 8px;">
      <div style="font-size:9pt; font-weight:700; color:#64748B; margin-bottom:4px;">몰입도</div>
      <div style="font-size:18pt; font-weight:900; color:${engColor};">${energy.engagementPct}%</div>
      <div style="font-size:8.5pt; color:${engFgColor};">${engDesc.split('.')[0]}</div>
    </div>
  </div>

  <!-- 지금 당신에게 맞는 전략 -->
  <div style="background:${motivBg}; border:1.5px solid ${motivColor}40; border-radius:12px; padding:16px 20px;">
    <div style="font-size:11pt; font-weight:800; color:#0F172A; margin-bottom:10px;">🎯 ${energy.stage}인 당신에게 — 지금 바로 할 수 있는 것</div>
    <div style="font-size:11pt; color:#374151; line-height:1.8; margin-bottom:12px;">${stageInterp?.action || '지금 단계에 맞는 전략으로 한 걸음씩 나아가세요.'}</div>
    ${(() => {
      const stageActions: Record<string, string[]> = {
        '성장활성기': ['이력서·포트폴리오 최신화', '관심 기업 5곳 지원 준비', '현직자 커피챗 1건 잡기'],
        '균형조율기': ['이번 주 작은 행동 1개 실행', '관심 직무 JD 3개 분석', '멘토·선배에게 연락하기'],
        '잠재축적기': ['관심 직무 JD 1개 읽기', '리포트 결과 주변에 공유하기', '탐색할 분야 1개 정하기'],
        '전환가속기': ['현직자 1명 만나기', '커뮤니티 가입 후 활동', '방향성 검증 질문 3개 작성'],
        '탐색진행기': ['다양한 직무 탐색 계속', '인턴·프로젝트 참여 검토', '결정을 서두르��� 않기'],
        '방향설정기': ['이 리포트 Focus·Anchor 재독', '10분 저널링으로 원하는 것 정리', '상담사·멘토에게 연락'],
        '돌파시도기': ['환경 변화 시도(새 모임·프로젝트)', '작은 성공 경험 만들기', '동기를 함께 할 사람 찾기'],
        '에너지충전기': ['오늘 자신을 위한 시간 1개', '충분한 수면·휴식 우선', '커리어는 잠시 내려놓기'],
        '기반구축기': ['전문 상담 서비스 이용 검토', '기본 루틴 1개 회복', '혼자가 아님을 기억하기'],
      };
      const actions = stageActions[energy.stage] || ['지금 단계를 인식하는 것 자체가 시작입니다'];
      return actions.map((a: string) => `<div style="display:flex; align-items:center; gap:8px; margin-bottom:5px;"><div style="width:6px; height:6px; border-radius:50%; background:${energyFg}; flex-shrink:0;"></div><span style="font-size:10.5pt; color:#374151;">${a}</span></div>`).join('');
    })()}
  </div>

  <div class="pg-foot"><span>FACE Career Report</span><span></span></div>
</div>`;

  h = h.replace(/<!-- ENERGY_PAGES_PLACEHOLDER -->/, energyPages);

  // ─── 나만의 커리어 준비 체크리스트 (동적) ───
  const checkItem = (text: string, tag: string, color: string, bg: string) =>
    `<div class="check-item" style="font-size:12pt; margin-bottom:11px; align-items:flex-start;">
      <div class="check-box" style="margin-top:4px; flex-shrink:0;"></div>
      <span style="line-height:1.6;">${text} <span style="font-size:8.5pt; font-weight:700; padding:2px 8px; border-radius:4px; background:${bg}; color:${color}; margin-left:5px; white-space:nowrap;">${tag}</span></span>
    </div>`;
  const sectionLabel = (type: 'must' | 'good') =>
    type === 'must'
      ? `<div style="font-size:8pt; font-weight:800; color:#0F172A; letter-spacing:.12em; margin:10px 0 8px; display:flex; align-items:center; gap:6px;"><span style="display:inline-block; width:12px; height:2px; background:#0F172A; border-radius:1px;"></span>MUST HAVE</div>`
      : `<div style="font-size:8pt; font-weight:700; color:#94A3B8; letter-spacing:.12em; margin:12px 0 8px; display:flex; align-items:center; gap:6px;"><span style="display:inline-block; width:12px; height:1px; background:#CBD5E1; border-radius:1px;"></span>GOOD TO HAVE</div>`;

  // ① F 블록 — 직무 방식 적합 (Focus 기반)
  const focusJobChecks: Record<string, string[]> = {
    Empathy:   [
      '사람과 소통하고 관계를 만드는 업무가 이 직무의 핵심인가?',
      `나의 Core Fit 직무(${coreJobs.slice(0,2).map((j:any)=>j.job).join(', ')})에 해당하거나 그 범위 안인가?`,
      '이 직무에서 팀 협업과 사람 관리가 실제로 이루어지는가?',
    ],
    Creative:  [
      '새로운 것을 기획하고 실험하는 자유가 이 직무에 실제로 있는가?',
      `나의 Core Fit 직무(${coreJobs.slice(0,2).map((j:any)=>j.job).join(', ')})에 해당하거나 그 범위 안인가?`,
      '기존 방식을 개선하거나 처음 만드는 역할이 포함되어 있는가?',
    ],
    Operative: [
      '체계적인 프로세스 안에서 실행하고 완성하는 역할이 중심인가?',
      `나의 Core Fit 직무(${coreJobs.slice(0,2).map((j:any)=>j.job).join(', ')})에 해당하거나 그 범위 안인가?`,
      '역할과 책임의 범위가 명확하게 정의되어 있는가?',
    ],
    Architect: [
      '데이터와 구조를 분석하고 설계하는 업무가 이 직무의 중심인가?',
      `나의 Core Fit 직무(${coreJobs.slice(0,2).map((j:any)=>j.job).join(', ')})에 해당하거나 그 범위 안인가?`,
      '문제를 정의하고 해결 방향을 설계하는 역할이 포함되어 있는가?',
    ],
  };
  const fChecks = focusJobChecks[focusTypeName] || focusJobChecks['Architect'];
  const fBlock = `
  <div style="margin-bottom:18px;">
    <div style="font-size:11.5pt; font-weight:800; color:var(--co); letter-spacing:.06em; margin-bottom:8px;">
      BLOCK 1 — 이 직무가 나의 방식으로 일할 수 있는 자리인가
    </div>
    ${sectionLabel('must')}
    ${checkItem(fChecks[0], pt?.korean || focusTypeName, '#1e40af', '#dbeafe')}
    ${checkItem(fChecks[1], 'Core Fit', '#166534', '#DCFCE7')}
    ${sectionLabel('good')}
    ${checkItem(fChecks[2], '직무구조', '#374151', '#F1F5F9')}
  </div>`;

  // ② A 블록 — 조직 가치 적합 (Anchor 기반)
  const anchorOrgQuestions: Record<string, string> = {
    전문성: '이 조직에서 한 분야를 깊이 파고들 수 있는 환경이 보장되는가?',
    성장: '역할이 확장되고 빠르게 배울 수 있는 구조가 갖춰져 있는가?',
    자율: '업무 방식과 방향을 내가 스스로 결정할 수 있는 문화인가?',
    안정: '장기적으로 안정적으로 일할 수 있는 구조와 환경인가?',
    기여: '내 일이 사람과 사회에 직접적인 영향을 미치는 조직인가?',
    균형: '퇴근 후 나만의 시간이 실질적으로 보장되는 문화인가?',
  };
  const a1q = anchorOrgQuestions[anchorAll[0]?.def?.korean] || `${anchorAll[0]?.def?.korean} 가치를 충족하는 조직인가?`;
  const a2q = anchorOrgQuestions[anchorAll[1]?.def?.korean] || `${anchorAll[1]?.def?.korean} 가치를 충족하는 조직인가?`;
  const aBlock = `
  <div style="margin-bottom:18px;">
    <div style="font-size:11.5pt; font-weight:800; color:var(--cr); letter-spacing:.06em; margin-bottom:8px; ">
      BLOCK 2 — 이 조직이 내가 중요하게 여기는 것을 충족하는가
    </div>
    ${sectionLabel('must')}
    ${checkItem(a1q, anchorAll[0]?.def?.korean, '#92400E', '#FEF3C7')}
    ${checkItem(a2q, anchorAll[1]?.def?.korean, '#1E40AF', '#DBEAFE')}
    ${sectionLabel('good')}
    ${checkItem(`조직 유형(${topOrgName})이 내 앵커 궁합과 일치하거나 가까운가?`, '조직유형', '#166534', '#DCFCE7')}
    ${checkItem('실제 문화(리뷰·현직자 후기)를 통해 위 두 가지를 검증했는가?', '사전조사', '#374151', '#F1F5F9')}
  </div>`;

  // ③ C 블록 — 역량 발휘 가능성 (Capacity 기반)
  const topComp1 = allScored[0]?.name || '핵심 역량';
  const topComp2 = allScored[1]?.name || '보조 역량';
  const growthComp = allScored.filter((c:any) => c.score < 60 && c.nadaum?.level !== 'non_nadaum')?.[0]?.name || '성장 역량';
  const cBlock = `
  <div style="margin-bottom:8px;">
    <div style="font-size:11.5pt; font-weight:800; color:var(--su); letter-spacing:.06em; margin-bottom:8px; ">
      BLOCK 3 — 내 역량이 이 JD에서 실제로 쓰이는가
    </div>
    ${sectionLabel('must')}
    ${checkItem(`JD에 내 강점 역량(${topComp1}, ${topComp2})이 직접 언급되거나 요구되는가?`, '강점역량', '#166534', '#DCFCE7')}
    ${checkItem('필수 자격요건 중 내가 현재 채우지 못하는 항목이 1개 이하인가?', '요건충족', '#374151', '#F1F5F9')}
    ${sectionLabel('good')}
    ${checkItem(`우대사항에 내가 키우고 있는 역량(${growthComp})이 포함되어 있는가?`, '성장역량', '#854D0E', '#FEF3C7')}
    ${checkItem('팀 구조와 실제 업무 방식이 JD 또는 현직자 후기에서 확인되는가?', '팀문화', '#374151', '#F1F5F9')}
  </div>`;

  const careerChecklistPage = `
<div class="page" style="padding-top:20mm; padding-bottom:16mm;">
  <div class="pg-head"><span style="color:var(--co); font-weight:700;">나만의</span><span style="color:#64748B;">실전 커리어 체크리스트</span></div>

  <div style="font-size:20pt; font-weight:900; color:#0F172A; line-height:1.3; margin-bottom:4px;">지원 전, 이것만 확인하세요</div>
  <div style="font-size:11.5pt; color:#64748B; margin-bottom:20px;">${pt?.korean || focusTypeName} · ${anchorAll[0]?.def?.korean}+${anchorAll[1]?.def?.korean} · 현재 에너지 ${energy.stage}</div>

  ${fBlock}
  ${aBlock}
  ${cBlock}

  <div class="pg-foot"><span>FACE Career Report</span><span>28</span></div>
</div>`;

  h = h.replace('<!-- CAREER_CHECKLIST_PLACEHOLDER -->', careerChecklistPage);

  // ─── 30일 플랜 ───
  h = h.replaceAll('{{FOCUS_PRIMARY_KOREAN}}', pt?.korean || focusTypeName);

  // ─── F×A×C×E 전체 요약 — 개인화 해설 시스템 ───
  const stageInterpFinal = (ENERGY_STAGE_INTERPRETATIONS as any)?.[energy.stage];

  // ⑥ 조사 처리 (을/를, 이/가, 은/는)
  const josa = (word: string, jo: '을' | '이' | '은') => {
    if (!word) return '';
    const last = word.charCodeAt(word.length - 1);
    const hasJong = (last - 0xAC00) % 28 !== 0;
    const map: Record<string, [string, string]> = { '을': ['을', '를'], '이': ['이', '가'], '은': ['은', '는'] };
    return word + map[jo][hasJong ? 0 : 1];
  };

  // ① Focus 유형별 서술 — 강점 + 단점 + 조언 포함
  const focusNarrative: Record<string, {core: string; strength: string; caution: string}> = {
    Empathy: {
      core: `사람과의 신뢰 속에서 가장 빛나는 유형입니다. 상대방의 감정과 맥락을 자연스럽게 읽어내고, 그 이해를 바탕으로 관계를 단단하게 엮어내는 능력이 탁월합니다.`,
      strength: `팀이 갈등할 때 중재하고, 조용히 신뢰를 쌓으며 결과를 만들어가는 힘이 있습니다. "저 사람이 있으면 팀이 편해진다"는 평가가 자연스럽게 따라옵니다.`,
      caution: `다만 타인을 먼저 챙기다 보면 자신의 의견과 한계를 표현하는 데 주저할 수 있습니다. 자신의 커리어 목표를 먼저 챙기는 연습, "No"를 말하는 연습이 성장의 핵심입니다.`,
    },
    Creative: {
      core: `기존의 틀을 깨고 새로운 가능성을 만들어내는 유형입니다. 남들이 "원래 이렇게 해왔어"라고 할 때, "왜 이렇게 해야 하지?"를 가장 먼저 묻는 사람입니다.`,
      strength: `아이디어를 연결하고 실험을 두려워하지 않는 에너지가 팀의 혁신 동력이 됩니다. 정해진 길이 없는 도전적인 환경에서 오히려 역량이 폭발합니다.`,
      caution: `다양한 가능성에 끌리다 보면 하나에 집중하기 어려울 수 있습니다. 아이디어를 실행으로 연결하는 루틴과 완성까지 가는 인내가 크리에이티브 유형의 가장 중요한 성장 과제입니다.`,
    },
    Operative: {
      core: `계획을 세우고 끝까지 실행해내는 신뢰의 유형입니다. 체계적인 프로세스와 명확한 역할 구조 속에서 안정적으로 성과를 만들어냅니다.`,
      strength: `"믿고 맡길 수 있는 사람"이라는 평가를 자연스럽게 받습니다. 복잡한 프로젝트를 처음부터 끝까지 완성하는 실행력과 팀이 흔들릴 때 기준을 잡아주는 힘이 있습니다.`,
      caution: `안정적 실행을 선호하다 보면 빠른 방향 전환이나 모호한 상황에서 스트레스를 받을 수 있습니다. 빠른 피드백 루프가 있는 환경에서의 경험이 성장을 가속화합니다.`,
    },
    Architect: {
      core: `세상을 구조와 논리로 이해하는 유형입니다. 복잡한 문제를 마주하면 자동으로 "왜?"를 묻고 원인을 파고들며, 흩어진 정보를 명확한 구조로 정리해내는 능력이 뛰어납니다.`,
      strength: `팀 안에서 본질을 짚어내고 체계를 만드는 역할을 자연스럽게 맡게 됩니다. 남들이 놓치는 패턴을 먼저 발견하고, 그 구조 위에서 팀 전체의 방향을 설계하는 힘이 있습니다.`,
      caution: `완벽하게 정리된 상태에서 시작하려는 경향이 있어, 속도가 중요한 순간에 실행이 늦어질 수 있습니다. "80% 상태에서 먼저 치고 나가기"를 의도적으로 연습하는 것이 핵심 성장 과제입니다.`,
    },
  };
  const fn = focusNarrative[focusTypeName] || focusNarrative['Architect'];

  // ② Anchor 가치 상세 서술
  const anchorDetail: Record<string, {label: string; detail: string}> = {
    전문성: { label: '전문성',  detail: '넓게 아는 것보다 한 분야에서 누구보다 깊이 파고드는 것을 가치 있게 여깁니다. 스스로를 특정 영역의 전문가로 성장시킬 수 있는 환경이 필수입니다' },
    성장:   { label: '성장',    detail: '역할이 계속 확장되고 더 큰 도전을 할 수 있는 환경에서 에너지를 얻습니다. 제자리걸음이 아니라 매 분기 내가 성장하고 있다는 느낌이 중요합니다' },
    자율:   { label: '자율',    detail: '방식을 스스로 선택할 수 있을 때 가장 좋은 결과를 만들어냅니다. 마이크로매니지먼트 환경에서는 역량이 제대로 발휘되지 않을 수 있습니다' },
    안정:   { label: '안정',    detail: '장기적으로 흔들리지 않는 구조와 예측 가능한 환경에서 몰입도가 올라갑니다. 생활과 커리어 모두에서 안정적인 기반이 있을 때 가장 꾸준한 성과를 냅니다' },
    기여:   { label: '기여',    detail: '내 일이 사람과 세상에 직접적인 영향을 미칠 때 가장 강한 동기를 느낍니다. "이 일이 왜 중요한가"에 대한 답이 명확하지 않으면 몰입이 어렵습니다' },
    균형:   { label: '균형',    detail: '일과 삶의 경계가 지켜지고 나로서의 시간이 보장될 때 번아웃 없이 꾸준히 달릴 수 있습니다. 지속 가능한 페이스가 장기 성과의 기반입니다' },
  };
  const ad1 = anchorDetail[anchorAll[0]?.def?.korean] || { label: anchorAll[0]?.def?.korean || '', detail: '' };
  const ad2 = anchorDetail[anchorAll[1]?.def?.korean] || { label: anchorAll[1]?.def?.korean || '', detail: '' };

  // ③ 조직 유형 — 장점 + 주의사항 포함
  const orgFullDesc: Record<string, {label: string; pros: string; cons: string}> = {
    외국계:         { label: '외국계 기업',       pros: '수평적 조직 문화, 전문성 중심 평가, 합리적인 의사결정 구조가 잘 맞습니다. 성과가 명확히 인정받는 환경에서 자신의 역량을 제대로 발휘할 수 있습니다.', cons: '다만 성과 기준이 냉정하고 직급 성장보다 전문성 심화 중심이므로, 빠른 직급 상승을 원한다면 기대치 조정이 필요합니다.' },
    대기업:         { label: '대기업',            pros: '안정적인 구조와 체계적인 교육, 명확한 커리어 로드맵이 강점입니다. 여러 팀과의 협업으로 커리어 초기에 폭넓은 시야를 키울 수 있습니다.', cons: '의사결정이 느리고 개인이 주도권을 잡기 어려운 구조일 수 있습니다. 자율성이 중요하다면 역할과 팀 문화를 입사 전에 충분히 확인해야 합니다.' },
    스타트업:       { label: '스타트업',           pros: '빠른 의사결정과 높은 자율성, 내 역할 이상의 경험이 가능한 환경입니다. 성과가 바로 보이고 성장 속도가 압도적으로 빠릅니다.', cons: '구조 불안정과 리소스 한계로 번아웃 위험이 높습니다. 시리즈 A 이상의 스테이지와 팀 구성을 꼼꼼히 따져보는 게 중요합니다.' },
    공공기관:       { label: '공공기관·준정부기관', pros: '높은 안정성과 사회적 기여감, 예측 가능한 커리어 경로가 강점입니다. 삶의 안정을 설계하는 데 유리한 환경입니다.', cons: '변화 속도가 느리고 성과보다 연차 중심 평가가 답답하게 느껴질 수 있습니다. 도전욕이 강하다면 내부에서 프로젝트 역할을 적극적으로 찾아야 합니다.' },
    중견기업:       { label: '중견기업',           pros: '대기업의 안정성과 스타트업의 자율성을 어느 정도 갖추고 있습니다. 핵심 멤버로 실질적인 기여를 하며 성장 가능성과 안정성이 균형을 이룹니다.', cons: '회사마다 편차가 크므로 문화와 성장 방향을 입사 전에 철저히 확인하는 것이 중요합니다.' },
    강소기업:       { label: '강소기업',           pros: '특정 분야에서 독보적인 전문성을 가진 기업에서 깊이 있는 역량을 쌓을 수 있습니다. 핵심 인재로 빠르게 인정받는 구조입니다.', cons: '인지도가 낮아 이직 시 추가 설명이 필요하고, 복지·보상이 대기업 수준에 미치지 못할 수 있습니다. 업계 내 평판을 꼼꼼히 검증하세요.' },
    '프리랜서/1인': { label: '프리랜서·1인 사업',  pros: '완전한 자율성과 프로젝트 선택권, 역량에 따른 직접적인 보상이 강점입니다.', cons: '수입 불안정과 모든 것을 혼자 해결해야 하는 부담이 있습니다. 초기 네트워크와 포트폴리오 구축에 상당한 에너지가 필요합니다.' },
    '사회적기업/NGO': { label: '소셜벤처·NGO',     pros: '사회적 가치를 직접 실현하면서 일하는 환경으로, 기여에서 오는 동기가 매우 강합니다. 내 일이 세상에 미치는 영향이 눈에 보이기 때문에 몰입도가 높습니다.', cons: '보상 수준이 시장 평균보다 낮을 수 있으며, 조직 규모가 작아 리소스 한계를 자주 체감할 수 있습니다.' },
    공무원:         { label: '공무원',             pros: '고용 안정성이 최상급이며, 예측 가능한 커리어 경로와 균형 잡힌 삶의 리듬이 보장됩니다. 사회 전반에 기여한다는 공적 사명감도 강점입니다.', cons: '성과 중심 평가보다 연차·직급 체계가 지배적이고, 변화 속도가 느려 성장욕이 강한 분에게는 답답하게 느껴질 수 있습니다. 초기 적응 기간에 관료적 문화에 대한 마음의 준비가 필요합니다.' },
  };
  const orgFull = orgFullDesc[catMatches[0]?.korean] || { label: topOrgName, pros: `${topOrgName}이 잘 맞는 선택지입니다.`, cons: '' };
  const org2Full = orgFullDesc[catMatches[1]?.korean];

  // ④ 에너지 단계 — 긍정적이고 구체적인 서술
  const energyNarrative: Record<string, {state: string; meaning: string; action: string}> = {
    '성장활성기': {
      state:   '지금 ${userName}님의 에너지는 최고조입니다.',
      meaning: '이 시기는 커리어에서 자주 오지 않는 골든 타임입니다. 동기, 행동력, 몰입도가 모두 올라와 있는 지금이 가장 큰 도전을 해도 해낼 수 있는 때입니다.',
      action:  '준비가 100% 될 때를 기다리지 마세요. 지금 바로 관심 직무의 JD를 3개 찾아 읽고, 현직자 커피챗 하나를 잡아보세요. 이 에너지가 있는 동안 한 발을 내디딘 사람이 6개월 후 가장 멀리 가 있습니다.',
    },
    '도약준비기': {
      state:   '${userName}님은 지금 도약 직전의 가장 중요한 시점에 있습니다.',
      meaning: '아직 완전히 준비됐다는 느낌은 아닐 수 있지만, 사실 이미 충분히 갖추고 있습니다. 도전의 불꽃이 피어오르는 지금이 첫 실행의 적기입니다.',
      action:  '구체적인 목표 하나를 정하고 이번 주 안에 한 가지 행동으로 옮기세요. 완벽한 계획보다 작은 실행이 더 빠른 길입니다.',
    },
    '탐색적응기': {
      state:   '${userName}님은 지금 자신만의 방향을 찾아가는 여정 중에 있습니다.',
      meaning: '다양한 자극과 경험으로 커리어의 단서를 모아가는 중요한 시기입니다. 이 탐색이 나중에 가장 확실한 나침반이 됩니다.',
      action:  '성급한 결정보다 지금은 넓게 경험하는 것이 더 중요합니다. 관심 분야 커피챗 한 번, 유관 공고 하나 읽어보는 것부터 시작하세요. 탐색을 충분히 한 사람이 결국 가장 정확한 선택을 합니다.',
    },
    '기반구축기': {
      state:   '${userName}님은 지금 내실을 다지는 중요한 재충전의 시간을 보내고 있습니다.',
      meaning: '당장의 도전보다 에너지를 회복하고 기반을 탄탄히 쌓는 것이 더 빠른 도약으로 이어집니다. 이 시기를 잘 보낸 사람이 나중에 가장 멀리 도약합니다.',
      action:  '지금은 회복과 정비에 집중하세요. 작은 성취를 쌓고 에너지를 채운 뒤 움직이는 게 훨씬 효율적인 전략입니다.',
    },
  };
  const en = energyNarrative[energy.stage] || energyNarrative['탐색적응기'];
  const enState = en.state.replace('${userName}', userName);

  // ⑤ 역량 상위 2개
  const topComp1Name = allScored[0]?.name || '';
  const topComp2Name = allScored[1]?.name || '';
  const topComp1Score = allScored[0]?.score || 0;
  const topComp2Score = allScored[1]?.score || 0;

  // 확장 가능 직무 (Focus 유형 기준)
  const jobExpansion: Record<string, string[]> = {
    Architect:  ['데이터 분석가', 'UX 리서처', '전략기획', '컨설턴트'],
    Creative:   ['콘텐츠 기획', '브랜드 마케터', '서비스 기획', 'UX 디자이너'],
    Operative:  ['PM/PO', '운영 기획', '품질관리', '프로세스 디자이너'],
    Empathy:    ['HRD', '커뮤니티 매니저', '교육 기획', 'CS 전략'],
  };
  const expandJobs = (jobExpansion[focusTypeName] || []).filter(j => j !== coreJobs[0]?.job && j !== coreJobs[1]?.job).slice(0, 3);

  // ⑦ 단락 조합 — 풍부한 내러티브
  const para1 = `${userName}님은 <strong style="color:var(--co);">${fn.core}</strong> ${fn.strength} ${fn.caution}`;

  const para2 = `${userName}님이 일에서 반드시 충족되어야 하는 것은 <strong style="color:var(--cr);">${ad1.label}</strong>과 <strong style="color:var(--cr);">${ad2.label}</strong>입니다. ${ad1.detail}, ${ad2.detail}. 이 두 가지가 채워지지 않으면 아무리 좋은 조건의 회사라도 오래 버티기 어렵습니다. <strong style="color:var(--cr);">${orgFull.label}</strong>은 이 조건에 잘 맞는 선택지입니다. ${orgFull.pros} ${orgFull.cons}${org2Full ? ` <strong style="color:var(--cr);">${org2Full.label}</strong>도 고려할 수 있는 좋은 선택지입니다. ${org2Full.pros}` : ''}`;

  const para3 = `역량 측면에서는 <strong style="color:var(--su);">${josa(topComp1Name, '이')}</strong> 가장 뚜렷한 강점(${topComp1Score}점)으로, ${topComp2Name}(${topComp2Score}점)이 이를 단단히 받쳐주고 있습니다. 이 조합이 가장 잘 발휘되는 직무는 <strong style="color:var(--su);">${coreJobs[0]?.job || ''}</strong>이며${coreJobs[1] ? `, <strong style="color:var(--su);">${coreJobs[1].job}</strong>에서도 충분히 통할 역량을 갖추고 있습니다.` : '.'} ${expandJobs.length > 0 ? `여기에 그치지 않고, <strong style="color:var(--su);">${expandJobs.join(' · ')}</strong> 방향으로도 역량을 확장할 수 있는 가능성이 충분합니다.` : ''}`;

  const para4 = `${enState} ${en.meaning} ${en.action}`;

  const oneLiner = `<span style="color:var(--co);">${pt?.korean || focusTypeName}</span>으로서 <span style="color:var(--cr);">${ad1.label}과 ${ad2.label}</span>을 중심에 두고, <span style="color:var(--su);">${coreJobs[0]?.job || ''}</span>에서 강점을 발휘하며, <span style="color:#C4B5FD;">${energy.stage}</span>의 에너지로 지금 나아갑니다.`;

  const faceSummaryPage = `
<div class="page bg-dark" style="padding-top:22mm; padding-bottom:12mm;">
  <div class="pg-head">
    <span style="color:var(--co); font-weight:700;">F</span><span style="color:#475569;">×</span><span style="color:var(--cr); font-weight:700;">A</span><span style="color:#475569;">×</span><span style="color:var(--su); font-weight:700;">C</span><span style="color:#475569;">×</span><span style="color:#A78BFA; font-weight:700;">E</span>
    <span style="color:#475569;">&nbsp;&nbsp;${userName}님의 커리어 단서</span>
  </div>

  <div style="font-size:18pt; font-weight:900; color:white; line-height:1.35; margin-bottom:5px;">${userName}님이라는 사람,<br>일의 단서를 찾았습니다</div>
  <div style="font-size:10pt; color:#475569; margin-bottom:16px;">4개 모듈을 종합한 개인화 해설</div>

  <!-- F 단락 -->
  <div style="display:flex; gap:12px; margin-bottom:11px; align-items:flex-start;">
    <div style="width:5px; flex-shrink:0; background:var(--co); border-radius:3px; margin-top:3px; align-self:stretch;"></div>
    <div>
      <div style="font-size:8.5pt; font-weight:700; color:var(--co); letter-spacing:.1em; margin-bottom:4px;">F — 일하는 방식 · 강점과 주의점</div>
      <div style="font-size:10.5pt; color:#CBD5E1; line-height:1.9; letter-spacing:.01em; word-break:keep-all;">${para1}</div>
    </div>
  </div>

  <!-- A 단락 -->
  <div style="display:flex; gap:12px; margin-bottom:11px; align-items:flex-start;">
    <div style="width:5px; flex-shrink:0; background:var(--cr); border-radius:3px; margin-top:3px; align-self:stretch;"></div>
    <div>
      <div style="font-size:8.5pt; font-weight:700; color:var(--cr); letter-spacing:.1em; margin-bottom:4px;">A — 중요한 가치 · 맞는 조직과 주의할 점</div>
      <div style="font-size:10.5pt; color:#CBD5E1; line-height:1.9; letter-spacing:.01em; word-break:keep-all;">${para2}</div>
    </div>
  </div>

  <!-- C 단락 -->
  <div style="display:flex; gap:12px; margin-bottom:11px; align-items:flex-start;">
    <div style="width:5px; flex-shrink:0; background:var(--su); border-radius:3px; margin-top:3px; align-self:stretch;"></div>
    <div>
      <div style="font-size:8.5pt; font-weight:700; color:var(--su); letter-spacing:.1em; margin-bottom:4px;">C — 강점 역량 · 핵심 직무와 확장 가능성</div>
      <div style="font-size:10.5pt; color:#CBD5E1; line-height:1.9; letter-spacing:.01em; word-break:keep-all;">${para3}</div>
    </div>
  </div>

  <!-- E 단락 -->
  <div style="display:flex; gap:12px; margin-bottom:14px; align-items:flex-start;">
    <div style="width:5px; flex-shrink:0; background:#8B5CF6; border-radius:3px; margin-top:3px; align-self:stretch;"></div>
    <div>
      <div style="font-size:8.5pt; font-weight:700; color:#A78BFA; letter-spacing:.1em; margin-bottom:4px;">E — 지금의 에너지 · 지금 도전해야 하는 이유</div>
      <div style="font-size:10.5pt; color:#CBD5E1; line-height:1.9; letter-spacing:.01em; word-break:keep-all;">${para4}</div>
    </div>
  </div>

  <!-- 한 줄 종합 -->
  <div style="background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:14px 18px;">
    <div style="font-size:8.5pt; color:#475569; letter-spacing:.1em; margin-bottom:7px;">✦ &nbsp;당신을 한 문장으로</div>
    <div style="font-size:11.5pt; font-weight:700; color:white; line-height:1.85; letter-spacing:-.01em;;">${oneLiner}</div>
  </div>

  <div class="pg-foot"><span>FACE Career Report</span><span>25</span></div>
</div>`;

  h = h.replace('<!-- FACE_SUMMARY_PLACEHOLDER -->', faceSummaryPage);

  // ─── 관심영역 (lines 983-996) — keep static for now, no interest data saved ───
  // (Interest area data is collected but not stored in localStorage yet)

  return h;
}

function ReportContent() {
  const searchParams = useSearchParams();
  const isPrint = searchParams.get('print') === '1';
  const [status, setStatus] = useState<'loading' | 'no_data' | 'ready'>('loading');
  const [html, setHtml] = useState('');

  useEffect(() => {
    async function load() {
      // 1. localStorage 우선
      let r: any = null;
      try { r = computeAll(); } catch (e) { console.error('computeAll error:', e); }

      // 2. localStorage 없으면 Supabase에서 최신 진단 로드
      if (!r) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data: { user } } = await sb.auth.getUser();
          if (user) {
            // users 테이블에서 user_id 조회
            const { data: profile } = await sb.from('users').select('id, name').eq('auth_id', user.id).single();
            if (profile) {
              // 최신 진단 1건 조회
              const { data: diag } = await sb
                .from('diagnoses')
                .select('answers, desired_job')
                .eq('user_id', profile.id)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
              if (diag?.answers) {
                const restored = { ...diag.answers, userName: profile.name, desiredJob: diag.desired_job };
                // localStorage에도 복원해두기
                localStorage.setItem('face_diagnosis', JSON.stringify(restored));
                r = computeAll(restored);
              }
            }
          }
        } catch (e) {
          console.error('Supabase fallback failed:', e);
        }
      }

      if (!r) { setStatus('no_data'); return; }

      try {
        const res = await fetch('/report-template.html');
        const template = await res.text();
        const finalHtml = replaceTemplate(template, r);
        setHtml(finalHtml);
        setStatus('ready');
      } catch {
        setStatus('no_data');
      }
    }

    load();
  }, []);

  // print 모드: document 전체를 report HTML로 교체 → Puppeteer가 캡처
  useEffect(() => {
    if (isPrint && status === 'ready' && html) {
      document.open();
      document.write(html);
      document.close();
      (window as any).__reportReady = true;
    }
  }, [isPrint, status, html]);

  if (isPrint) return null; // print 모드에서는 React 렌더 안 함

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-4xl animate-pulse">📊</div>
      <p className="ml-4 text-gray-500">리포트를 생성하고 있습니다...</p>
    </div>
  );

  if (status === 'no_data') return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">진단 결과가 없습니다</h2>
        <a href="/diagnosis" className="bg-[#22C55E] text-white font-bold px-8 py-3 rounded-xl">진단하기</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex justify-between items-center">
        <button onClick={() => window.location.href = '/result'} className="text-sm text-gray-500">← 결과 요약</button>
        <span className="text-sm font-bold">FACE 프리미엄 리포트</span>
        <button onClick={() => {
          const w = window.open('', '_blank');
          if (w) { w.document.write(html); w.document.close(); w.print(); }
        }} className="text-sm text-[#22C55E] font-bold">PDF 저장</button>
      </div>
      <div className="pt-14">
        <iframe
          srcDoc={html}
          className="w-full border-0"
          style={{ minHeight: '100vh', height: '30000px' }}
          title="FACE Premium Report"
        />
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportContent />
    </Suspense>
  );
}
