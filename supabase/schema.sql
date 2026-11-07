-- Awarely (Life Context Assistant) - Complete Database Schema (Phase 2)
-- Paste and run this SQL in your Supabase Project's SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create the activities table
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (
        category IN ('household', 'outdoor', 'fitness', 'work', 'leisure')
    ),
    start_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    monitoring_enabled BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'in_progress', 'completed', 'cancelled')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach the trigger to activities
DROP TRIGGER IF EXISTS set_activities_updated_at ON public.activities;
CREATE TRIGGER set_activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_start_time ON public.activities(start_time);
CREATE INDEX IF NOT EXISTS idx_activities_category ON public.activities(category);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);

-- 6. Row Level Security (RLS) Preparation
-- Enables RLS so table access can be secured with policies
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Phase 2 Policy: Allow full access without auth (Phase 3 will scope to auth.uid())
DROP POLICY IF EXISTS "Public full access during Phase 2" ON public.activities;
CREATE POLICY "Public full access during Phase 2"
    ON public.activities
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 7. Seed Initial Data
INSERT INTO public.activities (title, description, category, start_time, duration_minutes, monitoring_enabled, status)
VALUES
    ('Drying Clothes', 'Hang laundry outdoors on the backyard line', 'household', timezone('utc'::text, now() + interval '2 hours'), 120, true, 'pending'),
    ('Morning 5K Jog', 'Cardio run around the park loop', 'fitness', timezone('utc'::text, now() - interval '4 hours'), 45, false, 'completed'),
    ('Hand-Wash Car', 'Wash and wax vehicle in driveway', 'outdoor', timezone('utc'::text, now() + interval '4 hours'), 60, true, 'pending'),
    ('Water Garden Plants', 'Soak raised beds and potted herbs', 'household', timezone('utc'::text, now() + interval '5 hours 30 minutes'), 30, true, 'pending'),
    ('Weekly Planning & Context Review', 'Review calendar and context-sensitive task schedules', 'work', timezone('utc'::text, now() + interval '7 hours'), 40, false, 'pending')
ON CONFLICT DO NOTHING;
