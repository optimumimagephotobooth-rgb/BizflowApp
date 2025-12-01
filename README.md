# BizflowApp

Experience Agent for BizflowApp is a lightweight Node + Supabase service that captures conversational interactions, surfaces onboarding guidance, and exposes dashboard metrics so you can turn customer conversations into reliable SaaS outcomes.

## Quick start

1. `git clone https://github.com/optimumimagephotobooth-rgb/BizflowApp.git`
2. `cd BizflowApp`
3. `npm install`
4. Copy `.env.example` (if you add one) or create `.env` with:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_API_KEY=your-service-key
   PORT=3000
   ```
5. `npm run dev` (or `npm start`)

Supabase is required to unlock the onboarding tracking and dashboard metrics.

## Endpoints that power onboarding + dashboards

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Basic health check for uptime monitoring. |
| `GET /api/agent` | Agent metadata used to build hero cards. |
| `GET /api/onboarding/steps` | Returns guided onboarding steps (claim workspace, configure agent, invite the team, measure). |
| `POST /api/onboarding/progress` | Store or report progress on onboarding steps (requires `user_id` and `step_id`). If Supabase is not configured yet, the request is accepted but cached in-memory for diagnostics. |
| `GET /api/dashboard/summary` | Aggregated KPI snapshot (total interactions, unique users, recent messages) for dashboards. Falls back gracefully when Supabase is missing. |
| `POST /api/interactions` | Persist every interaction to `agent_interactions`. |
| `GET /api/interactions/:user_id` | Retrieve a user’s latest engagement history. |

Use the onboarding endpoints to drive SaaS landing pages and dashboards that show progress and live metrics in real time.

The API now exposes `/api/dashboard/verticals` so the console (and any customer UI) can highlight per-vertical totals/goals (cleaning, photobooth, courses) alongside the AI growth checklist. Each action logs a `business_type` so your Supabase dashboards and the new hero dropdown remain in sync with the service the customer actually runs.

The console (`/`) now acts as a full landing experience: hero copy that distinguishes Cleaning Services, Photobooth, and the Gold Wealth Academy course storefront, an AI growth checklist that mirrors `/api/onboarding/steps`, a course-delivery widget for SendGrid confirmations, dashboards with shareable KPI snapshots, and quick interactions so non-technical operators can feel the value without calling APIs or installing plugins. It remains plugged into Supabase, Stripe, and SendGrid, and everything can be refreshed with the “Refresh dashboard” CTA.

New features: a dropdown selector keeps the console focused on the chosen vertical, the dashboard now surfaces delta badges for total interactions/unique users, and the `/api/dashboard/verticals` endpoint powers the hero stats so every vertical can track interactions and course deliveries with goals attached (cleaning, photobooth, courses).

## Run instructions

This is a Node.js/Express app. Run it with `npm start` (or `node server.js`), not `gunicorn main:app`. If you see references to `main.py` or `gunicorn` in your Replit run configuration, switch the command to `npm start` so the Express server (not a Python module) launches.  

## Additional service verticals

The same stack works for any service business: plumbing, electricians, hair salons/barbers, fitness studios/personal training, car detailing, HVAC, landscaping, tutoring/online courses, photography, and nail salons. Every module (voice assistant, booking, lead gen, marketing, reviews, retention, upsells, follow-ups, referrals, reels) plugs into the dropdown and dashboards so operators see the impact without touching the API.

## Growth toolkit

Inside `/` you’ll now find an “AI Growth Toolkit” that lists every packaged service (AI Voice Assistant, Booking System, Lead Generator, Email Marketing, Review Management, Retention, Upsell, Quote Follow-ups, Referral, Video Reel Generator) with pricing (just `£29.99/month` per tool so each module feels affordable). Each card lets you choose the matching vertical—when you click “Activate”, the UI focuses the checklist, dashboards, and SendGrid widget on that business line so the toolkit feels like a real product catalog.

The customer interaction form now ships with pre-built AI marketing templates (capture course links, review requests, booking confirmations, lead follow-ups, upsell pitches). Selecting a template auto-populates the message and tags the interaction with the correct `business_type`, so every prompt turns into measurable pipeline activity.

## AI playbooks

The console now ships with ten plumber-friendly playbooks priced at £12 each. Each card explains the “what” in plain language (e.g., “Get more customers automatically,” “Stop missing calls & messages,” “Quick quotes without the hassle,” “A clear plan to start today”) and lists what the operator will gain, like instant replies, booking links, review reminders, or routine checklists. Running a playbook still sets the vertical, loads the correct template, logs the interaction, and refreshes the KPI stats.

The layout has also shifted to tabbed panels (Playbooks, Dashboard, Pricing, Insights) so the most important sections show in digestible chunks instead of one long page. This keeps the experience light, structured, and easy to navigate for non-technical teams.

## Login experience

`/login.html` is a lightweight welcome screen for lifetime-access customers. It hits `/api/stripe/check-lifetime-access?email=...`, stores the confirmed tier, and then routes to `/`. If the endpoint replies with `hasLifetimeAccess:true`, the client automatically redirects to the console; otherwise it surfaces a friendly error message encouraging the operator to contact support.

## Tiered pricing guide

We now display three tiers in the console: Base (£90/mo) for voice/booking/lead automation, Growth (£150/mo) for marketing/review/upsell pipelines plus two included playbooks, and Premium (£220/mo) which adds course delivery automation, WhatsApp insights, and video reel generation. Each tier includes unlimited dashboards and the AI Growth Toolkit; extra playbooks stay at £12 each so customers can expand without big backend changes.

We also surface ROI proof: every playbook activation refreshes delta badges, the insights card shares wins via WhatsApp or clipboard, and the console highlights the annual 2-month-free discount plus a 30-day free playbook. That way prospects see the impact before a penny is committed.

## Playbook engagement tracking

New endpoints `/api/playbook-run` and `/api/playbook-stats` record every run and can be used to highlight the most popular playbooks (best sellers). The console can now call `/api/playbook-stats` to build an “engagement” card so you know which modules are moving the needle.

## Security highlights

Security badges appear on the landing console (PCI-aligned, API key protection, Supabase RLS ready, weekly audits, 99.9% uptime). They reinforce that this SaaS is premium, encrypted, and compliant while remaining inviting to small service businesses.

## Environment variables

- `SUPABASE_URL` + `SUPABASE_API_KEY`: required for all CRUD operations.
- `BIZFLOW_API_KEY`: optional API key that must be sent in `x-api-key`. Set `BIZFLOW_ALLOW_INSECURE=true` during local demos to skip the header check; unset it in production to require the key.
- `SENDGRID_API_KEY` + `SENDGRID_SENDER`: when provided, `/api/course-delivery` will send a SendGrid email and log the delivery.

## Course delivery + sharing helpers

`POST /api/course-delivery` (requires API key unless insecure mode enabled) expects `{ email, courseTitle, note }`. The server sends the email via SendGrid (if configured) and records an interaction so the dashboard learns about the sale. The console form already calls this endpoint and displays whether the email was dispatched.

## Built-in console

The repo ships a lightweight plug-and-play console at `/` that showcases the onboarding steps, lets you mark steps complete, persists agent interactions, and renders the dashboard summary. Just run the server, open `http://localhost:3000`, and you can:

- Inspect each onboarding step and mark progress with metadata.  
- Track real-time KPI metrics from `/api/dashboard/summary`.  
- Log interactions or pull a given user’s conversation history without building another UI.  

This console keeps the experience testable while your customers integrate the API with their existing SaaS surface.

## Supabase schema

Use the included `SUPABASE_SCHEMA.sql` to bootstrap the two tables that underpin onboarding + analytics:

```sql
-- Run this in Supabase SQL editor
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.agent_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  user_message text,
  agent_response text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  step_id text NOT NULL,
  completed boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

Run the SQL once when you create the Supabase project, then point the `.env` variables to that project.

## Next improvements

- Add a React/Next landing experience that hits `/api/onboarding/steps` and `/api/dashboard/summary` to guide new customers through the funnel.
- Sweep analytics to color-code success metrics (e.g., number of completed onboarding steps, average response lag).
- Surface upgrade prompts when `dashboard.summary` shows high throughput so you can monetize happy customers.

Every improvement above boosts the onboarding story, gives the dashboard more context, and keeps the SaaS experience cohesive.

