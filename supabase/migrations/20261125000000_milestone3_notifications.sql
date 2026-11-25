-- Milestone 3: notification types, notification timestamps, and sync state.
-- Safe to run on the current production schema.

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace whichever inline check constraint currently restricts notification types.
DO $$
DECLARE
    constraint_record record;
BEGIN
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.notifications'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%weather_alert%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.notifications DROP CONSTRAINT %I',
            constraint_record.conname
        );
    END LOOP;
END $$;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check CHECK (
        type IN (
            'weather_alert',
            'reminder',
            'activity_completed',
            'forecast_changed',
            'weather_resolved',
            'system'
        )
    );

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

DROP TRIGGER IF EXISTS set_notifications_updated_at ON public.notifications;
CREATE TRIGGER set_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.app_settings
    ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

ALTER TABLE public.app_settings
    ADD COLUMN IF NOT EXISTS last_sync_status TEXT;

ALTER TABLE public.app_settings
    ADD COLUMN IF NOT EXISTS last_sync_error TEXT;
