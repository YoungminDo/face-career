import { FOCUS_TYPES, COMP_NAMES, JOB_COMPETENCY_MAPPING } from '@/data/mappings';
import {
  calcFitScores, determineFitType, applyRefine,
  calcAnchorScores, getTopAnchors,
  calcCapacityScores, calcEnergyScores,
  calcJobFit, calcCategoryMatch,
} from '@/data/scoring';
import { anchorLikertQuestions } from '@/data/questions';

const CODE_TO_TYPE: Record<string, string> = { Em: 'Empathy', Cr: 'Creative', Op: 'Operative', Ar: 'Architect' };

export interface DiagnosisRecord {
  id: string;
  userName: string;
  birthYear: string | null;
  gender: 'male' | 'female' | null;
  currentStatus: 'student' | 'worker' | null;
  desiredJob: string | null;
  completedAt: string;
  // raw answers
  energy: number[];
  focus: any[];
  focusRefine?: string[];
  focusResult?: any;
  anchorLikert: number[];
  anchorTradeoff: string[];
  anchorInterest: any[];
  anchorResult?: any;
  capacity: any[];
}

export interface ProcessedDiagnosis {
  id: string;
  userName: string;
  birthYear: string | null;
  gender: string;
  currentStatus: string;
  desiredJob: string;
  completedAt: string;
  focusType: string;
  focusTypeKorean: string;
  focusTypeColor: string;
  subTypeCode: string;
  energyStage: string;
  energyLevel: string;
  energyEmoji: string;
  coreJob: string;
  coreJobPct: number;
  top2Anchors: string;
  reportGenerated: boolean;
}

export function loadHistory(): DiagnosisRecord[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('face_diagnosis_history') || '[]');
}

export function processRecord(raw: DiagnosisRecord): ProcessedDiagnosis {
  try {
    const energy = calcEnergyScores(raw.energy || []);

    const focusScores = calcFitScores(raw.focus || []);
    let focus = determineFitType(focusScores);
    if (focus.needsRefine && raw.focusRefine?.length) {
      const refined = applyRefine(focusScores, raw.focusRefine);
      focus = { ...focus, ...refined, subTypeCode: refined.primary + refined.secondary };
    }

    const likertObj: Record<string, number> = {};
    anchorLikertQuestions.forEach((q: any, i: number) => {
      likertObj[q.anchor] = raw.anchorLikert?.[i] || 4;
    });
    const anchorScores = calcAnchorScores(likertObj as any, raw.anchorTradeoff || []);
    const top2 = getTopAnchors(anchorScores, 2);

    const { scaled } = calcCapacityScores(raw.capacity || []);
    const focusTypeName = CODE_TO_TYPE[focus.primary] || focus.primary;
    const focusSecondaryName = CODE_TO_TYPE[focus.secondary] || focus.secondary;
    const pt = (FOCUS_TYPES as any)[focusTypeName];

    const jobFits = JOB_COMPETENCY_MAPPING.map(j => ({
      job: j.job, category: j.category,
      ...calcJobFit(scaled, focusTypeName, j.comps, focusSecondaryName),
    })).sort((a, b) => b.pct - a.pct);

    const quadrantPriority: Record<string, number> = { sweet_spot: 0, potential: 1, acquired_str: 2, not_fit: 3 };
    const coreJobs = [...jobFits].sort((a, b) => {
      const pa = quadrantPriority[a.quadrant.code] ?? 3;
      const pb = quadrantPriority[b.quadrant.code] ?? 3;
      return pa !== pb ? pa - pb : b.pct - a.pct;
    });

    const ANCHOR_DEFS: Record<string, string> = {
      mastery: '전문성', growth: '성장', autonomy: '자율',
      stability: '안정', purpose: '기여', balance: '균형',
    };

    return {
      id: raw.id,
      userName: raw.userName || '회원',
      birthYear: raw.birthYear,
      gender: raw.gender === 'male' ? '남성' : raw.gender === 'female' ? '여성' : '',
      currentStatus: raw.currentStatus === 'student' ? '취업 준비' : raw.currentStatus === 'worker' ? '직장인' : '',
      desiredJob: raw.desiredJob?.split('|')[1] || '',
      completedAt: raw.completedAt,
      focusType: focusTypeName,
      focusTypeKorean: pt?.korean || focus.primary,
      focusTypeColor: pt?.color || '#94A3B8',
      subTypeCode: focus.subTypeCode || `${focus.primary}${focus.secondary}`,
      energyStage: energy.stage,
      energyLevel: energy.energyLevel,
      energyEmoji: energy.energyLevel === 'green' ? '🟢' : energy.energyLevel === 'yellow' ? '🟡' : '🔴',
      coreJob: coreJobs[0]?.job || '',
      coreJobPct: coreJobs[0]?.pct || 0,
      top2Anchors: `${ANCHOR_DEFS[top2[0].anchor] || ''} × ${ANCHOR_DEFS[top2[1].anchor] || ''}`,
      reportGenerated: false,
    };
  } catch {
    return {
      id: raw.id,
      userName: raw.userName || '회원',
      birthYear: raw.birthYear,
      gender: '', currentStatus: '', desiredJob: '',
      completedAt: raw.completedAt,
      focusType: '', focusTypeKorean: '', focusTypeColor: '#94A3B8',
      subTypeCode: '', energyStage: '', energyLevel: '', energyEmoji: '',
      coreJob: '', coreJobPct: 0, top2Anchors: '', reportGenerated: false,
    };
  }
}

export function loadProcessed(): ProcessedDiagnosis[] {
  return loadHistory().map(processRecord);
}
