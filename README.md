# TBN-Server

API for The Builder Network — a MyBuilder-style marketplace connecting UK homeowners with verified tradespeople.
NestJS 11 · Prisma 7 (Postgres on Neon) · Socket.IO · Stripe Checkout · Resend · S3/CloudFront.

## How the marketplace works

1. **Homeowner posts a job** (title, description, answers, photos, postcode). Matching trades within their work radius get a lead; invited trades ("Request a quote") are flagged.
2. **Trade expresses interest** — free to send; the job's lead fee (per-service credits) is **held**. Only verified (`APPROVED`) trades can respond; others can preview.
3. **Homeowner shortlists** (max 5) — contact details are exchanged, chat opens and the held credits are **charged**. Declining, withdrawing, not being selected or expiry **releases** them.
4. **Hire → complete → review** (reviews require a hired trade, 365-day window). Trades can ask for a review and request credits back (admin-reviewed).
5. Credits: 20 welcome credits, packs bought via Stripe Checkout; every movement is an append-only row in `credit_transactions`.

Admin endpoints live under `/api/v1/admin/*` (ADMIN role) and back the separate TBN-Admin-Web app.

## Setup

```bash
pnpm install
cp .env.example .env            # fill in values (see below)
npx prisma migrate deploy       # uses DIRECT_URL (non-pooled)
npx prisma db seed              # services, trades and per-service lead fees
pnpm tsx scripts/create-admin.ts   # admin@thebuildernetwork.com; password → .admin-credentials (git-ignored)
pnpm start:dev                  # http://localhost:3000
```

Key environment variables: `DATABASE_URL` (pooled), `DIRECT_URL`, `JWT_SECRET`, `FRONTEND_URL`, `ADMIN_URL`
(both are added to CORS), `RESEND_API_KEY`, `EMAIL_FROM`, `AWS_*`/`CLOUDFRONT_URL`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `WELCOME_CREDITS` (default 20).

### Stripe webhooks locally

```bash
docker run --rm -e STRIPE_API_KEY stripe/stripe-cli listen --print-secret   # → STRIPE_WEBHOOK_SECRET
docker run --rm -e STRIPE_API_KEY stripe/stripe-cli listen \
  --forward-to host.docker.internal:3000/api/v1/payments/webhook
```

In production, add a webhook endpoint at `https://<api-host>/api/v1/payments/webhook` for
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
`checkout.session.expired` and `charge.refunded`, and use its signing secret.

## Checks

```bash
pnpm lint
npx tsc -p tsconfig.build.json --noEmit
node scripts/smoke-lifecycle.mjs   # full marketplace lifecycle against a running dev server (never on prod)
```

## Notes

- Emails are sent via Resend from `noreply@thebuildernetwork.com`; the domain must be verified in Resend or sends fail (logged, never thrown).
- Hourly crons expire leads (7 days) and listings (30 days) under a Postgres advisory lock, so multiple instances are safe.
