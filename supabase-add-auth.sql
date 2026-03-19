-- FACE Career — Auth 연동 스키마 추가
-- Supabase SQL Editor에서 실행

-- users 테이블에 auth_id 컬럼 추가 (Supabase Auth UUID 연결)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- diagnoses 테이블에 report_generated 플래그 추가
ALTER TABLE diagnoses ADD COLUMN IF NOT EXISTS report_generated BOOLEAN DEFAULT false;

-- 기존 RLS 정책 유지 (개발용 전체 허용)
-- 프로덕션 전환 시 아래 정책으로 변경:
-- CREATE POLICY "users: own data only" ON users
--   FOR ALL USING (auth_id = auth.uid());
-- CREATE POLICY "diagnoses: own data only" ON diagnoses
--   FOR ALL USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));