-- BizflowApp schema additions for onboarding and analytics
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.agent_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  user_message text,
  business_type text,
  agent_response text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  step_id text NOT NULL,
  business_type text,
  completed boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Optional: index for fast filtering by step_id
CREATE INDEX IF NOT EXISTS idx_onboarding_step ON public.onboarding_progress (step_id);
CREATE INDEX IF NOT EXISTS idx_agent_business_type ON public.agent_interactions (business_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_business_type ON public.onboarding_progress (business_type);

CREATE TABLE IF NOT EXISTS public.playbook_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id text NOT NULL,
  business_type text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playbook_runs_id ON public.playbook_runs (playbook_id);

