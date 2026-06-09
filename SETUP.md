# Ivula Canopy — Launch Setup Guide

## Stack
- **Frontend/Backend:** Next.js 15 (App Router) → Vercel
- **Database/Auth:** Supabase (PostgreSQL + RLS)
- **Billing:** Stripe ($25/mo per org, 14-day trial)
- **Email:** Resend (hello@ivulatechnologies.com)

---

## Step 1 — Supabase Setup

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it `ivula-canopy`, pick a strong DB password, save it
3. Once created, go to **SQL Editor** → paste the entire contents of `supabase/migrations/001_initial_schema.sql` → Run
4. Go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2 — Stripe Setup

1. Go to [stripe.com](https://stripe.com) → Dashboard
2. **Create a Product:**
   - Products → Add Product
   - Name: `Ivula Canopy`
   - Pricing: Recurring, $25.00/month
   - Copy the **Price ID** (starts with `price_...`) → `STRIPE_PRICE_ID`
3. **Get API Keys** → Developers → API Keys:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
4. **Create Webhook** (do this after Vercel deploy):
   - Developers → Webhooks → Add endpoint
   - URL: `https://YOUR_DOMAIN/api/stripe/webhook`
   - Events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.payment_succeeded`
   - Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`
5. **Enable Billing Portal:**
   - Settings → Billing → Customer portal → Activate

---

## Step 3 — Resend (Email) Setup

1. Go to [resend.com](https://resend.com) → Sign up
2. **Add Domain:**
   - Domains → Add Domain → enter `ivulatechnologies.com`
   - Add the DNS records shown to your domain registrar
   - Wait for verification (usually <5 min)
3. **Get API Key:**
   - API Keys → Create API Key
   - Copy it → `RESEND_API_KEY`

---

## Step 4 — Vercel Deploy

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select `ivula-technologies/ivula-canopy`
3. **Add Environment Variables** (Settings → Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL=          (from Step 1)
NEXT_PUBLIC_SUPABASE_ANON_KEY=     (from Step 1)
SUPABASE_SERVICE_ROLE_KEY=         (from Step 1)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=(from Step 2)
STRIPE_SECRET_KEY=                 (from Step 2)
STRIPE_WEBHOOK_SECRET=             (from Step 2 — after deploy)
STRIPE_PRICE_ID=                   (from Step 2)
NEXT_PUBLIC_APP_URL=               https://your-app.vercel.app (or custom domain)
NEXT_PUBLIC_TRIAL_DAYS=            14
RESEND_API_KEY=                    (from Step 3)
RESEND_FROM_EMAIL=                 hello@ivulatechnologies.com
```

4. Deploy. Once live, go back to Stripe and add the webhook URL (Step 2.4).

---

## Step 5 — Make Yourself Super Admin

After you sign up at your live URL:

1. Go to Supabase → SQL Editor → run:
```sql
UPDATE profiles SET role = 'super_admin' WHERE email = 'biusmichael16@gmail.com';
```

---

## Step 6 — Onboard Your 5 Organizations

Each org admin visits your site and clicks **"Start free trial"**:
- They enter their org name + their name
- Then their email + password
- They're in — 14-day trial starts immediately

**To invite them directly**, share your URL with this message:
> "Sign up at [your URL] to get your organization set up. It's free for 14 days — no credit card needed."

---

## Architecture Summary

```
User visits /signup
  → Creates auth.users record (Supabase)
  → Triggers handle_new_user() → creates profiles row
  → POST /api/organizations
      → Creates organizations row (with trial_ends_at = now + 14d)
      → Creates Stripe customer
      → Links profile to org
      → Sends welcome email via Resend

Admin logs in → /dashboard
  → Server component reads profile + org via RLS
  → All data is org-scoped — no cross-tenant leakage possible

Member checks in via QR:
  /checkin/[token] (public, no login)
  → Looks up event by checkin_token
  → Member picks their name
  → POST /api/checkin/record (uses service role, validates org membership)
  → Attendance recorded with method='qr'

Stripe subscription:
  Trial starts at signup (14 days)
  Admin clicks "Upgrade" → /api/stripe/checkout → Stripe Checkout
  Payment → webhook → updates organizations.subscription_status
  Past due / cancelled → sidebar shows warning banner
```

---

## Roles

| Role | Can do |
|------|--------|
| `super_admin` | See all orgs (you) |
| `org_admin` | Full access to their org |
| `org_leader` | Add/edit members, events, attendance |
| `member` | Read-only portal (future) |

---

## Cost to Run (MVP, 5 orgs × 50 members)

| Service | Free tier | Cost |
|---------|-----------|------|
| Vercel | 100GB bandwidth | $0 |
| Supabase | 500MB DB, 50K MAU | $0 |
| Stripe | 2.9% + 30¢ per charge | ~$3.65/org/mo |
| Resend | 3,000 emails/mo | $0 |
| **Total** | | **~$0 infra + Stripe fees** |

Revenue at 5 paying orgs: **$125/mo**
Break-even: **1 org**
