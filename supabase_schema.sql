-- Supabase SQL Schema for SpaGuard (스파 시설 점검 로그)
-- Supabase 대시보드 -> SQL Editor 에서 아래 코드를 복사하여 실행해 주세요.

CREATE TABLE IF NOT EXISTS public.inspection_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_name TEXT NOT NULL,
    check_date DATE NOT NULL,
    inspector TEXT NOT NULL,
    security_code TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    items_state JSONB NOT NULL,
    summaries JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) 설정 (누구나 점검표 제출 가능하도록 허용)
ALTER TABLE public.inspection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert" ON public.inspection_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read" ON public.inspection_logs
    FOR SELECT USING (true);
