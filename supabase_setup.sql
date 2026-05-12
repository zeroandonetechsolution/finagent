-- Supabase Quick Setup Script
-- Run this in the Supabase SQL Editor to create the necessary table

CREATE TABLE IF NOT EXISTS public.app_state (
    id TEXT PRIMARY KEY,
    customers JSONB DEFAULT '[]'::jsonb,
    groups JSONB DEFAULT '[]'::jsonb
);

-- Set up Row Level Security (RLS) to allow public read/write for now
-- Note: For a production app, you would secure this further, 
-- but this matches the current client-side architecture.
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.app_state
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.app_state
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.app_state
    FOR UPDATE USING (true);

-- Insert the initial empty state so the app has something to update
INSERT INTO public.app_state (id, customers, groups) 
VALUES ('global_state', '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;
