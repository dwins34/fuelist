-- Table to store global application configuration
CREATE TABLE IF NOT EXISTS public.app_config (
    key       text        PRIMARY KEY,
    value     jsonb       NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Create policies
-- 1. Anyone can read config
CREATE POLICY "Allow public read-only access to app_config"
ON public.app_config FOR SELECT
USING (true);

-- 2. Only authenticated admins can modify (using the simple service_role for now or specific admin checks if available)
-- Note: In this project, admin checks are often handled at the API layer, 
-- but we can add a basic authenticated policy here.
CREATE POLICY "Allow service_role to manage app_config"
ON public.app_config FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Insert initial service status
INSERT INTO public.app_config (key, value)
VALUES (
    'service_status',
    '{"enabled": true, "message": "Currently out of service"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
