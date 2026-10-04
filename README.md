# Forge — multi-tenant commerce, prototyping and training platform

Stack: React + TypeScript + Vite + Tailwind, TanStack Query, Zod, Supabase (Auth, Postgres, Storage, Edge Functions, RLS).

## Setup
1. Create a Supabase project. Run `supabase/migrations/0001_core.sql`, then `supabase/seed.sql` in the SQL editor (or `supabase db push`).
2. `cp .env.example .env` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. `npm install && npm run dev`
4. Register, then complete onboarding. You become Organization Owner with all permissions.
5. AI: `supabase functions deploy ai-chat` and `supabase secrets set AI_PROVIDER=anthropic AI_API_KEY=... AI_MODEL=...`
6. Deploy the frontend to Vercel with the two `VITE_` variables.

## Security model
Authorization is enforced by Postgres RLS (`auth_org()`, `has_perm()`), never only in the UI. The AI function queries as the calling user, so it cannot exceed that user's access. No secrets use the `VITE_` prefix.

## Status
Implemented: auth, onboarding, RBAC + RLS, catalog, dashboard, cart + atomic checkout, payments (Razorpay/Stripe/test provider via Edge Function), orders timeline, support tickets, floating AI chat (Ctrl+J). LMS with certificates + public /verify-certificate/:code, command palette (Ctrl+K). Run migrations 0001-0008; deploy ai-chat, payment-create, refund-create and payment-webhook (webhook with --no-verify-jwt, URL ?provider=razorpay|stripe). Set PAYMENTS_MODE=production to disable the test provider.

## Notifications (EmailJS + Twilio)
Every important event (order, quotation, ticket, project, certificate) creates an in-app notification via database triggers (live via Realtime). To also send email and SMS:
1. `supabase functions deploy notify-dispatch --no-verify-jwt`, then set secrets: `NOTIFY_WEBHOOK_SECRET`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
2. Supabase Dashboard → Database → Webhooks → new webhook on table `notifications`, event INSERT, target the `notify-dispatch` function, add HTTP header `x-webhook-secret: <NOTIFY_WEBHOOK_SECRET>`.
3. EmailJS: in Account → Security enable "Allow EmailJS API for non-browser applications"; template variables are `{{to_email}}`, `{{title}}`, `{{message}}`.
4. Users choose email/SMS and add a phone (international format) on the Notifications page. A channel without credentials is skipped silently.

## AI actions
The assistant only proposes actions (`cancel_order`, `create_ticket`). The user must press Confirm; execution then runs under the user's own session, so RLS/RBAC decide, and it is audit-logged.

## Tests
`npm test` (vitest): CSV safety, prototyp give the readme with best ui and online images
