-- Awarely (Life Context Assistant) - Production schema
-- Run this in Supabase Dashboard > SQL Editor > New query.
--
-- Security model: this is a single-user app protected by an application
-- passcode. RLS is enabled on every table with NO anonymous policies, so the
-- public/anon key cannot read or write anything. The server uses the
-- service-role key (which bypasses RLS) behind the passcode gate.

-- 1. Extensions -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Activities -------------------------------------------------------------
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
    location VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Make the script idempotent for databases created by the earlier schema.
ALTER TABLE public.activities
    ADD COLUMN IF NOT EXISTS location VARCHAR(120);

-- 3. App settings (single row) ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
    default_location VARCHAR(120) NOT NULL DEFAULT 'Hyderabad',
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT,
    last_sync_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.app_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- 4. Notifications ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL CHECK (
        type IN (
            'weather_alert',
            'reminder',
            'activity_completed',
            'forecast_changed',
            'weather_resolved',
            'system'
        )
    ),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'danger')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    suggestion TEXT,
    scheduled_for TIMESTAMPTZ,
    dedupe_key TEXT NOT NULL UNIQUE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Web-push subscriptions -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_used_at TIMESTAMPTZ
);

-- 6. updated_at trigger -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_activities_updated_at ON public.activities;
CREATE TRIGGER set_activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER set_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_notifications_updated_at ON public.notifications;
CREATE TRIGGER set_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Indexes ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_start_time ON public.activities(start_time);
CREATE INDEX IF NOT EXISTS idx_activities_category ON public.activities(category);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(is_read)
    WHERE dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_activity ON public.notifications(activity_id);

-- 8. Row Level Security -----------------------------------------------------
-- Enable RLS and define NO policies. Anon/authenticated clients are therefore
-- denied entirely; only the server-side service-role key can access data.
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access during Phase 2" ON public.activities;

-- 9. Optional sample data ---------------------------------------------------
-- Uncomment to insert one demo activity after first login.
-- INSERT INTO public.activities
--     (title, description, category, start_time, duration_minutes, monitoring_enabled, status, location)
-- VALUES
--     ('Drying Clothes', 'Hang laundry outdoors on the backyard line', 'household',
--      timezone('utc'::text, now() + interval '2 hours'), 120, true, 'pending', 'Hyderabad');
