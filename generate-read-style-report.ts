import fs from 'fs';
import { calcFitScores, determineFitType, applyRefine, calcAnchorScores, getTopAnchors, calcCapacityScores, calcEnergyScores, calcInterestScores, calcJobFit, calcCategoryMatch, calcNadaumLevel } from '@/data/scoring';
import { COMP_NAMES, JOB_COMPETENCY_MAPPING } from '@/data/mappings';
import { anchorLikertQuestions } from '@/data/questions';
import { replaceTemplate } from '@/lib/reportEngine';

const CODE_TO_TYPE: Record<string, string> = { Em: 'Empathy', Cr: 'Creative', Op: 'Operative', Ar: 'Architect' };

function computeAll(data: any) {
  const energy = calcEnergyScores(data.energy || []);
  const focusScores = calcFitScores(data.focus || []);
  let focus = determineFitType(focusScores);
  if (focus.needsRefine && data.focusRefine?.length) {
    const refined = applyRefine(focusScores, data.focusRefine);
    focus = { ...focus, ...refined, subTypeCode: refined.primary + refined.secondary };
  }
  const likertObj: Record<string, number> = {};
  anchorLikertQuestions.forEach((q: any, i: number) => { likertObj[q.anchor] = data.anchorLikert?.[i] || 4; });
  const anchorScores = calcAnchorScores(likertObj as any, data.anchorTradeoff || []);
  const top2 = getTopAnchors(anchorScores, 2);
  const { scaled } = calcCapacityScores(data.capacity || []);
  const focusTypeName = CODE_TO_TYPE[focus.primary] || focus.primary;
  const focusSecondaryName = CODE_TO_TYPE[focus.secondary] || focus.secondary;
  const allCodes = Object.keys(COMP_NAMES).filter(c => c !== 'Fd1' && c !== 'Fd2');
  const allScored = allCodes.map(c => ({ code: c, name: COMP_NAMES[c], score: scaled[c] || 25, nadaum: calcNadaumLevel(c, focusTypeName, focusSecondaryName) })).sort((a, b) => b.score - a.score);
  const jobFits = JOB_COMPETENCY_MAPPING.map(j => ({ job: j.job, category: j.category, ...calcJobFit(scaled, focusTypeName, j.comps, focusSecondaryName) })).sort((a, b) => b.pct - a.pct);
  const catMatches = calcCategoryMatch(anchorScores);
  const interestScores = calcInterestScores(data.anchorInterest || []);
  const interestSorted = Object.entries(interestScores).sort((a, b) => b[1] - a[1]);
  return { focus, energy, anchorScores, top2, scaled, allScored, jobFits, catMatches, focusTypeName, focusSecondaryName, interestSorted, userName: data.userName || '회원', desiredJob: data.desiredJob || null };
}

const sampleData = {
  userName: "이준호", desiredJob: "브랜드 전략 / 마케팅 기획",
  focus: [
    { first: 'Cr', last: 'Op' }, { first: 'Cr', last: 'Ar' }, { first: 'Em', last: 'Op' },
    { first: 'Cr', last: 'Ar' }, { first: 'Em', last: 'Op' }, { first: 'Cr', last: 'Ar' },
    { first: 'Em', last: 'Op' }, { first: 'Cr', last: 'Op' }, { first: 'Em', last: 'Ar' },
    { first: 'Cr', last: 'Op' }, { first: 'Cr', last: 'Ar' }, { first: 'Em', last: 'Op' },
    { first: 'Cr', last: 'Ar' }, { first: 'Em', last: 'Op' }, { first: 'Cr', last: 'Ar' },
    { first: 'Em', last: 'Op' }, { first: 'Cr', last: 'Op' }, { first: 'Em', last: 'Ar' },
  ],
  focusRefine: ['Cr', 'Em'],
  anchorLikert: [5,7,6,3,5,4,6,7,5,4,6,5,5,6,7,3,4,5,6,7,5,4,3,6],
  anchorTradeoff: ['growth','autonomy','mastery'],
  anchorInterest: [5,7,6,4,3,2,5,4,6,7,3,2,5,6,4,3,7,5],
  capacity: [
    { first:'Cr4',last:'Op3'},{ first:'Em2',last:'Cd1'},{ first:'Cr1',last:'Ar2'},
    { first:'Em1',last:'Op1'},{ first:'Cr2',last:'Ar1'},{ first:'Em3',last:'Op2'},
    { first:'Cr3',last:'Ar3'},{ first:'Em4',last:'Cd2'},{ first:'Cr5',last:'Op4'},
    { first:'Em5',last:'Ar4'},{ first:'Cr4',last:'Op3'},{ first:'Em2',last:'Cd1'},
    { first:'Cr1',last:'Ar2'},{ first:'Em1',last:'Op1'},{ first:'Cr2',last:'Ar1'},
    { first:'Em3',last:'Op2'},{ first:'Cr3',last:'Ar3'},{ first:'Em4',last:'Cd2'},
    { first:'Cr5',last:'Op4'},{ first:'Em5',last:'Ar4'},{ first:'Cr4',last:'Op1'},
    { first:'Em2',last:'Ar2'},{ first:'Cr1',last:'Op3'},{ first:'Em1',last:'Cd1'},
  ],
  energy: [6,6,7,5,6,5,6,5,5,5,2,6,6,5,5,6]
};

const r = computeAll(sampleData);
const template = fs.readFileSync('C:/da-sh/READ_Career_Benchmark/report-template-read-style.html', 'utf-8');
let html = replaceTemplate(template, r);

// ===== POST-PROCESSING =====
const primaryCode = r.focus.primary;
const typeMap = {
  char:    { Cr: 'char_RR.png',     Em: 'char_EE.png',     Op: 'char_AA.png',     Ar: 'char_DD.png' },
  portrait:{ Cr: 'portrait_RR.png', Em: 'portrait_EE.png', Op: 'portrait_AA.png', Ar: 'portrait_DD.png' },
  color:   { Cr: '#ffac62',         Em: '#a2d791',         Op: '#fb7980',         Ar: '#6eb1ff' },
  light:   { Cr: '#fff3e8',         Em: '#f0f9ed',         Op: '#fff0f1',         Ar: '#eef6ff' },
} as const;

const charFile = typeMap.char[primaryCode as keyof typeof typeMap.char] || 'char_RR.png';
const portraitFile = typeMap.portrait[primaryCode as keyof typeof typeMap.portrait] || 'portrait_RR.png';
const mainColor = typeMap.color[primaryCode as keyof typeof typeMap.color] || '#ffac62';
const lightColor = typeMap.light[primaryCode as keyof typeof typeMap.light] || '#fff3e8';

// --- 동적 생성 페이지의 "CHARACTER ILLUST"는 원본 유지 (건드리지 않음) ---
// 일러스트는 템플릿의 4유형 카드 페이지에만 적용 (이미 img 태그로 되어있음)

// ===== SAVE =====
const outPath = 'C:/da-sh/READ_Career_Benchmark/sample-report-read-style.html';
fs.writeFileSync(outPath, html, 'utf-8');

const pageCount = (html.match(/class="page/g) || []).length;
const remaining = (html.match(/CHARACTER.{0,5}ILLUST/gi) || []).length;
const imgs = (html.match(/<img[^>]*(?:char_|portrait_)/gi) || []).length;
console.log(`Done! Pages: ${pageCount}, Size: ${(html.length/1024).toFixed(0)}KB`);
console.log(`Illustration images inserted: ${imgs}`);
console.log(`Remaining "CHARACTER ILLUST": ${remaining}`);
