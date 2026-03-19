-- FACE Career Report Queue
-- Supabase SQL 에디터에서 실행하세요

create table if not exists report_queue (
  id            uuid primary key default gen_random_uuid(),
  user_id       text,
  diagnosis_data jsonb not null,
  status        text not null default 'waiting'
                  check (status in ('waiting', 'processing', 'completed', 'failed')),
  position      int,
  progress      int default 0,          -- 0~100
  report_url    text,
  error_message text,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz default now()
);

-- 인덱스
create index if not exists report_queue_status_idx    on report_queue(status);
create index if not exists report_queue_created_at_idx on report_queue(created_at desc);
create index if not exists report_queue_user_id_idx   on report_queue(user_id);

-- RLS (Row Level Security) — 비활성화 상태로 두고 service role key로만 접근
-- alter table report_queue enable row level security;

-- report_files 버킷 (Storage)
-- Supabase 콘솔 → Storage → New bucket → "report-files" → Public: false
