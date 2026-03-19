// FACE Career Diagnosis — Mappings (유형-역량, 직무-역량, 조직카테고리)

// ─── 유형별 나다움 역량 (30개 전문역량 전부 배정) ───
export const FOCUS_TYPE_COMPETENCIES: Record<string, string[]> = {
  Empathy: ['Cn1','Cn2','Cn3','Cn4','In3','In4','Cn5','Ct2'],
  Creative: ['Ct1','Ct3','In7','Ct4','In2','Ct5','In1'],
  Operative: ['Dr10','Dr11','Dr6','In8','Cn6','Dr4','Dr3','Dr2'],
  Architect: ['In5','In6','Dr5','Dr7','Dr8','Dr9','Dr1'],
};

// ─── 역량 코드 → 한글 이름 ───
export const COMP_NAMES: Record<string, string> = {
  Fd1: '커뮤니케이션', Fd2: '문제해결력',
  In1: '전략적사고', In2: '시장통찰력', In3: '고객통찰력', In4: '조직통찰력',
  In5: '분석력', In6: '수리논리력', In7: '관점전환', In8: '평가력',
  Dr1: '의사결정력', Dr2: '목표지향성', Dr3: '효율성추구력', Dr4: '일정관리',
  Dr5: '프로세스설계', Dr6: '프로세스관리', Dr7: '비용관리', Dr8: '자금운용',
  Dr9: '계약관리', Dr10: '정확성', Dr11: '책임감',
  Cn1: '공감력', Cn2: '협상력', Cn3: '코칭', Cn4: '네트워킹',
  Cn5: '인재발굴력', Cn6: '제도설계력',
  Ct1: '창의력', Ct2: '스토리텔링', Ct3: '경험설계', Ct4: '변화적응력', Ct5: '기술이해',
};

// ─── 47개 직무 × 8 핵심역량 ───
export const JOB_COMPETENCY_MAPPING = [
  { category: '경영·전략', job: '경영기획', comps: ['In1','Dr1','Dr5','In2','Fd2','In4','In5','Dr2'] },
  { category: '경영·전략', job: '사업전략', comps: ['In1','In2','Dr2','Dr8','Dr1','Dr5','In5','Ct4'] },
  { category: '경영·전략', job: '예산·성과관리', comps: ['In6','Dr7','Dr8','Dr2','Dr3','Dr6','In5','Dr10'] },
  { category: '인사·조직', job: '인사관리', comps: ['In8','Dr10','Fd1','Cn1','Cn6','In4','Dr6','Dr11'] },
  { category: '인사·조직', job: '채용', comps: ['Cn5','Fd1','In3','Cn4','Dr1','In5','Cn1','Ct2'] },
  { category: '인사·조직', job: '교육·육성(HRD)', comps: ['Cn3','Cn6','In4','Ct2','In3','In7','Fd1','Ct3'] },
  { category: '인사·조직', job: '조직문화', comps: ['Cn1','Fd1','In4','Cn4','Ct3','Cn3','In7','Ct4'] },
  { category: '마케팅·브랜드', job: '브랜드전략', comps: ['Ct2','In2','In1','Ct3','In4','Fd1','Ct1','In7'] },
  { category: '마케팅·브랜드', job: '퍼포먼스마케팅', comps: ['Dr10','In6','Dr2','Dr5','Fd2','In2','In5','Dr3'] },
  { category: '마케팅·브랜드', job: '콘텐츠기획', comps: ['Ct1','Ct2','In7','In3','Ct3','Fd1','Ct4','Cn1'] },
  { category: '마케팅·브랜드', job: 'CRM', comps: ['In3','Fd1','In5','Dr6','Cn1','Fd2','Dr10','Dr2'] },
  { category: '영업·사업개발', job: '영업(B2B/B2C)', comps: ['Fd1','Cn1','In3','Cn2','Dr2','Cn4','Ct2','Dr11'] },
  { category: '영업·사업개발', job: '사업개발(BD)', comps: ['In2','In1','Fd1','Cn4','Fd2','Dr2','Ct4','Cn2'] },
  { category: '영업·사업개발', job: '제휴·파트너십', comps: ['Cn2','Cn4','Fd1','In2','Dr9','Dr2','Cn1','Dr5'] },
  { category: '재무·법무', job: '회계', comps: ['Dr10','In6','In5','Dr11','Dr6','Dr7','Dr8','In8'] },
  { category: '재무·법무', job: '재무기획', comps: ['In6','Dr7','Dr8','In5','Dr3','Dr2','In1','Dr1'] },
  { category: '재무·법무', job: '법무·감사', comps: ['Dr10','Dr11','In8','Dr6','Fd2','Fd1','Dr9','In5'] },
  { category: '서비스·기술', job: '서비스기획', comps: ['In3','Ct2','Dr5','Fd1','Ct3','Fd2','In7','In1'] },
  { category: '서비스·기술', job: '상품기획(MD)', comps: ['In2','In3','Fd1','Dr7','Dr2','In7','In5','Cn2'] },
  { category: '서비스·기술', job: '연구개발(R&D)', comps: ['In5','Ct5','Fd2','In6','Dr2','In1','In7','Dr11'] },
  { category: '서비스·기술', job: '품질관리(QA/QC)', comps: ['Dr10','In5','Fd2','Dr6','Dr11','Fd1','In8','Dr5'] },
  { category: '서비스·기술', job: '개발(백엔드/프론트)', comps: ['Ct5','Fd2','In5','Dr6','Dr10','Fd1','Dr5','In7'] },
  { category: '서비스·기술', job: '데이터사이언스', comps: ['In5','In6','Fd2','Dr10','In7','Dr5','Ct5','In1'] },
  { category: '서비스·기술', job: 'AI개발(AI/ML)', comps: ['Ct5','In5','Fd2','In6','In7','Dr5','Ct1','Dr2'] },
  { category: '서비스·기술', job: '정보보안', comps: ['Dr10','Fd2','In5','Dr11','Ct5','Dr6','In7','Dr1'] },
  { category: '운영·물류', job: '생산관리', comps: ['Dr6','Dr10','Dr3','Fd2','In5','Dr11','Dr5','Dr4'] },
  { category: '운영·물류', job: '구매·조달', comps: ['Cn2','Dr7','In2','Dr6','Dr1','Fd1','Dr9','Dr10'] },
  { category: '운영·물류', job: '물류·SCM', comps: ['Dr6','In5','Dr10','Fd2','Dr3','Fd1','Dr4','Dr5'] },
  { category: '운영·물류', job: '고객서비스(CS)', comps: ['Cn1','Fd1','Fd2','In3','Ct4','Dr11','Cn2','Dr3'] },
  { category: 'PM·PMO', job: '프로젝트관리(PM)', comps: ['Dr5','Fd1','Dr1','Fd2','In1','Dr11','Dr4','Cn4'] },
  { category: 'PM·PMO', job: 'PMO', comps: ['Dr6','Dr10','In5','Fd1','Cn4','Dr9','In8','Dr5'] },
  { category: 'PM·PMO', job: '사업운영기획', comps: ['In5','Dr5','Dr3','Fd1','Fd2','In2','Dr2','In1'] },
  { category: '디자인', job: '브랜드·그래픽디자인', comps: ['Ct1','Ct2','Ct3','In7','Fd1','Dr10','In3','Ct4'] },
  { category: '디자인', job: 'UX/UI디자인', comps: ['Ct3','In3','Fd2','Ct1','Dr5','Fd1','In7','In5'] },
  { category: '디자인', job: '일러스트·캐릭터', comps: ['Ct1','Ct2','In7','Ct3','Cn1','Fd1','Ct4','Dr4'] },
  { category: '디자인', job: '영상·모션디자인', comps: ['Ct2','Ct1','Ct3','Dr4','Fd1','Dr10','Ct5','In7'] },
  { category: '디자인', job: '제품·산업디자인', comps: ['Ct1','Ct5','Fd2','Ct3','Ct4','In7','In3','Dr5'] },
  { category: '디자인', job: '공간·인테리어디자인', comps: ['Ct1','Ct3','Ct2','In3','Fd2','Fd1','Dr7','Dr5'] },
  { category: '디자인', job: '음악·사운드', comps: ['Ct1','Ct3','Cn1','Ct2','In7','Cn3','Ct5','Ct4'] },
  { category: '디자인', job: '영상연출·PD', comps: ['Ct2','Ct1','Ct3','Fd1','Dr4','Fd2','Cn4','Dr1'] },
  { category: '디자인', job: '작가·스토리창작', comps: ['Ct1','Ct2','In7','Ct3','In3','Cn1','Ct4','Dr11'] },
  { category: '디자인', job: '공연·무대예술', comps: ['Ct1','Ct3','Cn1','Fd1','Fd2','Ct4','Cn3','Dr4'] },
  { category: '전문직·공공', job: '법률·세무·회계', comps: ['Dr10','In5','In6','Dr11','Fd2','Fd1','Dr9','In8'] },
  { category: '전문직·공공', job: '공학·제조·엔지니어링', comps: ['In5','Fd2','Ct5','Dr10','Dr6','Dr11','Dr5','In7'] },
  { category: '전문직·공공', job: '의료·보건', comps: ['Cn1','Dr10','Fd2','In3','Dr11','Fd1','In5','Cn3'] },
  { category: '전문직·공공', job: '연구·학술', comps: ['In5','In6','Ct5','Dr10','Fd2','In7','In1','Dr11'] },
  { category: '전문직·공공', job: '공공·안전·환경', comps: ['Dr11','Dr10','Fd2','In5','Dr6','Ct5','Fd1','In8'] },
];

// ─── 9개 기업 카테고리 ───
export const COMPANY_CATEGORIES: Record<string, { korean: string; anchorProfile: Record<string, number> }> = {
  civil_servant: { korean: '공무원', anchorProfile: { mastery: 30, growth: 20, autonomy: 15, stability: 95, purpose: 60, balance: 85 } },
  public_org: { korean: '공공기관', anchorProfile: { mastery: 40, growth: 30, autonomy: 20, stability: 90, purpose: 70, balance: 80 } },
  large_corp: { korean: '대기업', anchorProfile: { mastery: 50, growth: 70, autonomy: 30, stability: 80, purpose: 40, balance: 50 } },
  foreign_corp: { korean: '외국계', anchorProfile: { mastery: 70, growth: 75, autonomy: 65, stability: 60, purpose: 40, balance: 70 } },
  mid_corp: { korean: '중견기업', anchorProfile: { mastery: 55, growth: 55, autonomy: 45, stability: 65, purpose: 45, balance: 60 } },
  hidden_champ: { korean: '강소기업', anchorProfile: { mastery: 85, growth: 50, autonomy: 50, stability: 55, purpose: 40, balance: 50 } },
  startup: { korean: '스타트업', anchorProfile: { mastery: 55, growth: 90, autonomy: 85, stability: 15, purpose: 50, balance: 20 } },
  social_ent: { korean: '사회적기업/NGO', anchorProfile: { mastery: 40, growth: 45, autonomy: 55, stability: 30, purpose: 95, balance: 55 } },
  freelance: { korean: '프리랜서/1인', anchorProfile: { mastery: 70, growth: 60, autonomy: 95, stability: 10, purpose: 45, balance: 75 } },
};

// ─── 유형 정보 ───
export const FOCUS_TYPES = {
  Empathy: { code: 'Em' as const, korean: '교감형', color: '#22C55E', emoji: '🤝', desc: '사람의 마음을 읽고 연결하는' },
  Creative: { code: 'Cr' as const, korean: '창작형', color: '#F97316', emoji: '💡', desc: '없던 것을 상상하고 만드는' },
  Operative: { code: 'Op' as const, korean: '운영형', color: '#3B82F6', emoji: '🛡️', desc: '체계적으로 조직을 돌보는' },
  Architect: { code: 'Ar' as const, korean: '설계형', color: '#8B5CF6', emoji: '🔬', desc: '구조를 분석하고 설계하는' },
};

// ─── 앵커 정보 ───
export const ANCHOR_DEFS = {
  mastery: { korean: '전문성', emoji: '🔬' },
  growth: { korean: '성장', emoji: '🚀' },
  autonomy: { korean: '자율', emoji: '🦅' },
  stability: { korean: '안정', emoji: '🏠' },
  purpose: { korean: '기여', emoji: '🌱' },
  balance: { korean: '균형', emoji: '⚖️' },
};
