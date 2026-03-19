-- FACE Career — 전체 스키마 초기화
-- Supabase SQL Editor에서 이 파일 전체를 실행하세요

-- 1. 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  birth_year INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female')),
  current_status TEXT CHECK (current_status IN ('student', 'worker')),
  auth_id UUID UNIQUE,                          -- Supabase Auth 연결
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 진단 테이블
CREATE TABLE IF NOT EXISTS diagnoses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  desired_job TEXT,
  answers JSONB NOT NULL,
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
  report_generated BOOLEAN DEFAULT false,       -- PDF 발행 여부
  status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed')),
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 리포트 테이블
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  diagnosis_id UUID REFERENCES diagnoses(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'premium')),
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_user_id ON diagnoses(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_completed_at ON diagnoses(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnoses_focus_primary ON diagnoses(focus_primary);
CREATE INDEX IF NOT EXISTS idx_reports_diagnosis_id ON reports(diagnosis_id);

-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 개발용: 전체 허용 정책
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