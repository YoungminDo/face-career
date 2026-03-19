// FACE Career Diagnosis — Type Definitions

export type FocusType = 'Empathy' | 'Creative' | 'Operative' | 'Architect';
export type FocusCode = 'Em' | 'Cr' | 'Op' | 'Ar';
export type AnchorKey = 'mastery' | 'growth' | 'autonomy' | 'stability' | 'purpose' | 'balance';
export type InterestDirection = 'tech' | 'social' | 'business' | 'creative' | 'health' | 'green' | 'education' | 'org';
export type NadaumLevel = 'nadaum' | 'half_nadaum' | 'non_nadaum';
export type EnergyLevel = 'green' | 'yellow' | 'red';
export type EnergyStage = '성장활성기' | '균형조율기' | '잠재축적기' | '전환가속기' | '탐색진행기' | '방향설정기' | '돌파시도기' | '에너지충전기' | '기반구축기';

export interface FocusScores {
  Em: number;
  Cr: number;
  Op: number;
  Ar: number;
}

export interface FocusResult {
  primary: FocusCode;
  secondary: FocusCode;
  tertiary: FocusCode;
  inferior: FocusCode;
  scores: FocusScores;
  subTypeCode: string;
  needsRefine: boolean;
}

export interface AnchorScores {
  mastery: number;
  growth: number;
  autonomy: number;
  stability: number;
  purpose: number;
  balance: number;
}

export interface InterestScores {
  [key: string]: number;
}

export interface EnergyResult {
  motivPct: number;
  actionPct: number;
  engagementPct: number;
  motivLevel: string;
  actionLevel: string;
  stage: EnergyStage;
  energyLevel: EnergyLevel;
}

export interface NadaumResult {
  level: NadaumLevel;
  label: string;
  emoji: string;
  desc: string;
}

export interface JobFitResult {
  pct: number;
  nadaumPct: number;
  level: string;
  quadrant: { code: string; label: string; desc: string };
  details: JobFitDetail[];
}

export interface JobFitDetail {
  code: string;
  name: string;
  rawScore: number;
  isFoundation: boolean;
  weight: number;
  nadaum: NadaumLevel;
  nadaumLabel: string;
  nadaumEmoji: string;
}

export interface CategoryMatch {
  category: string;
  korean: string;
  similarity: number;
}

// Question types
export interface RankingQuestion {
  qnum: string;
  context: string;
  question: string;
  Em: string;
  Cr: string;
  Op: string;
  Ar: string;
}

export interface LikertQuestion {
  qnum: string;
  axis: string;
  subdim?: string;
  question: string;
  reversed?: boolean;
}

export interface AnchorLikertQuestion {
  qnum: string;
  anchor: AnchorKey;
  question: string;
}

export interface AnchorTradeoffQuestion {
  qnum: string;
  pair: [AnchorKey, AnchorKey];
  question: string;
  optionA: { anchor: AnchorKey; text: string };
  optionB: { anchor: AnchorKey; text: string };
}

export interface AnchorInterestQuestion {
  qnum: string;
  context: string;
  question: string;
  options: { text: string; direction: InterestDirection }[];
}

export interface CapacityQuestion {
  qnum: string;
  context: string;
  question: string;
  options: { text: string; code: string }[];
}

export interface JobMapping {
  category: string;
  job: string;
  comps: string[];
}

// Answer types for storing user responses
export interface RankingAnswer {
  first: FocusCode;  // 1위 (가장 나다움)
  last: FocusCode;   // 4위 (가장 아님)
}

export interface CapacityRankingAnswer {
  first: string;  // 1위 역량 코드
  last: string;   // 4위 역량 코드
}

export interface DiagnosisAnswers {
  energy: number[];              // 리커트 1~7, 16개
  focus: RankingAnswer[];        // 18개
  focusRefine?: FocusCode[];     // 7개 (조건부)
  anchorLikert: number[];        // 리커트 1~7, 6개
  anchorTradeoff: AnchorKey[];   // 6개 (승자 앵커)
  anchorInterest: RankingAnswer[]; // 6개
  capacity: CapacityRankingAnswer[]; // 24개
}

export interface DiagnosisResult {
  focus: FocusResult;
  anchor: {
    scores: AnchorScores;
    top2: [AnchorKey, AnchorKey];
  };
  interest: {
    scores: InterestScores;
    top2: { direction: string; score: number }[];
  };
  capacity: {
    raw: Record<string, number>;
    scaled: Record<string, number>;
  };
  energy: EnergyResult;
  jobFits: { job: string; category: string; result: JobFitResult }[];
  categoryMatches: CategoryMatch[];
}
