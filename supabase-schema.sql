-- FACE Career Diagnosis — Supabase Schema
-- Supabase SQL Editor에서 실행

-- 1. 사용자 테이블
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  birth_year INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female')),
  current_status TEXT CHECK (current_status IN ('student', 'worker')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 진단 테이블
CREATE TABLE diagnoses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  -- 기본 정보
  desired_job TEXT,
  -- 원본 응답 (전체 JSON)
  answers JSONB NOT NULL,
  -- 계산된 결과
  focus_primary TEXT,
  focus_secondary TEXT,
  focus_subtype TEXT,
  focus_scores JSONB,
  anchor_scores JSONB,
  anchor_top2 TEXT[],
  energy_stage TEXT,
  energy_level TEXT CHECK (energy_level IN ('green', 'yellow', 'red')),
  energy_motiv_pct INTEGER,
  energy_action_pct INTEGER,
  energy_engagement_pct INTEGER,
  core_job_1 TEXT,
  core_job_1_pct INTEGER,
  core_job_2 TEXT,
  core_job_3 TEXT,
  -- 상태
  status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed')),
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 리포트 테이블
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  diagnosis_id UUID REFERENCES diagnoses(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'premium')),
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_diagnoses_user_id ON diagnoses(user_id);
CREATE INDEX idx_diagnoses_completed_at ON diagnoses(completed_at DESC);
CREATE INDEX idx_diagnoses_focus_primary ON diagnoses(focus_primary);
CREATE INDEX idx_reports_diagnosis_id ON reports(diagnosis_id);

-- RLS (Row Level Security) — 일단 비활성화 (개발용)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 모든 읽기/쓰기 허용 (개발용, 프로덕션에서는 변경 필요)
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for diagnoses" ON diagnoses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for reports" ON reports FOR ALL USING (true) WITH CHECK (true);

-- 통계 뷰
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM users) AS total_users,
  (SELECT COUNT(*) FROM diagnoses) AS total_diagnoses,
  (SELECT COUNT(*) FROM diagnoses WHERE status = 'completed') AS completed_diagnoses,
  (SELECT COUNT(*) FROM reports) AS total_reports;
