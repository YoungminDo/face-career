// FACE Career Diagnosis — All Questions (auto-generated from diagnosis.js)
// Total: E(16) + F(18) + FR(7) + AL(6) + AT(6) + AI(6) + C(24) = 83문항

import questionsData from './questions.json';

export const energyQuestions = questionsData.energyQuestions;
export const fitQuestions = questionsData.fitQuestions;
export const fitRefineQuestions = questionsData.fitRefineQuestions;
export const anchorLikertQuestions = questionsData.anchorLikertQuestions;
export const anchorTradeoffQuestions = questionsData.anchorTradeoffQuestions;
export const anchorInterestQuestions = questionsData.anchorInterestQuestions;
export const capacityQuestions = questionsData.capacityQuestions;

// 전체 문항 수
export const QUESTION_COUNTS = {
  energy: energyQuestions.length,           // 16
  focus: fitQuestions.length,               // 18
  focusRefine: fitRefineQuestions.length,    // 7 (조건부)
  anchorLikert: anchorLikertQuestions.length,     // 6
  anchorTradeoff: anchorTradeoffQuestions.length,  // 6
  anchorInterest: anchorInterestQuestions.length,  // 6
  capacity: capacityQuestions.length,        // 24
  totalMin: 76,  // 정제 없을 때
  totalMax: 83,  // 정제 있을 때
};
