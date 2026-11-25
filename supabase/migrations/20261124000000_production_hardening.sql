-- Migration: production hardening + notifications + push + settings
-- Safe to run on a fresh database or on top of the Phase 2 schema.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Activities: add per-activity weather location
ALTER TABLE public.activities
    ADD COLUMN IF NOT EXISTS location VARCHAR(120);

-- App settings (singleton)
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
    default_location VARCHAR(120) NOT NULL DEFAULT 'Hyderabad',
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.app_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('weather_alert', 'reminder', 'system')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'danger')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    suggestion TEXT,
    scheduled_for TIMESTAMPTZ,
    dedupe_key TEXT NOT NULL UNIQUE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Web-push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_used_at TIMESTAMPTZ
);

-- updated_at trigger function (re-created so this migration is self-contained)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at trigger for settings
DROP TRIGGER IF EXISTS set_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER set_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(is_read)
    WHERE dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_activity ON public.notifications(activity_id);

-- Lock everything down for anon/authenticated clients
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access during Phase 2" ON public.activities;
