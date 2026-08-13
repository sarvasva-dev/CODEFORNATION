-- ==========================================
-- CODE FOR NATION - SUPABASE DATABASE SCHEMA
-- ==========================================

-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    score NUMERIC DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Index on score for fast Leaderboard sorting
CREATE INDEX IF NOT EXISTS idx_teams_score ON public.teams (score DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for Public Access (Read & Write)
DROP POLICY IF EXISTS "Allow public select" ON public.teams;
CREATE POLICY "Allow public select" ON public.teams
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert" ON public.teams;
CREATE POLICY "Allow public insert" ON public.teams
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update" ON public.teams;
CREATE POLICY "Allow public update" ON public.teams
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete" ON public.teams;
CREATE POLICY "Allow public delete" ON public.teams
    FOR DELETE USING (true);

-- 5. Seed Initial 15 Teams
INSERT INTO public.teams (id, name, score) VALUES
    ('team-1', 'Built4Bharat', 0),
    ('team-2', 'IND-Squad', 0),
    ('team-3', 'Nation Builders', 0),
    ('team-4', 'Brain Wave', 0),
    ('team-5', 'NextGen India', 0),
    ('team-6', 'Tech BBG', 0),
    ('team-7', 'Web Warriors', 0),
    ('team-8', 'Babamosie', 0),
    ('team-9', 'Future Thinkers', 0),
    ('team-10', 'BRX Devs', 0),
    ('team-11', 'Code Crafters', 0),
    ('team-12', 'ByteNations', 0),
    ('team-13', 'Mind Matrix', 0),
    ('team-14', 'Flexbox Fanatics', 0),
    ('team-15', 'The Dominaters', 0)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
