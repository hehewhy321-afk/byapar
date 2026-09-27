# Cloudflare Free Tier Production Setup & Operations Guide (2026 Edition)

This guide provides end-to-end instructions for deploying and configuring the **Cloudflare Free Tier** services for the **Byapar / Kirana** platform:
- **Cloudflare Pages**: Global Edge Hosting for Web App & Super Admin
- **Cloudflare Turnstile**: Smart Anti-Bot & Brute-Force Auth Shield
- **Cloudflare Zero Trust (Access)**: Super Admin Lockdown (50 Free Seats)
- **Cloudflare Email Routing**: Free Business Emails (`support@byapar.com`)
- **Cloudflare D1 + Workers**: Edge Branded Invoice Shortlinks (`pay.byapar.com/i/:slug`)
- **Cloudflare R2 CDN & Cache**: Zero-Cost Image Caching

---

## 1. Cloudflare Pages Deployment (Web App & Super Admin)

Both `apps/web` and `apps/admin` are optimized for Cloudflare Pages with pre-configured SPA client routing (`_redirects`) and edge security/immutable caching (`_headers`).

### A. Deploying Merchant Web App (`app.byapar.com`)
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Compute (Workers) > Pages**.
2. Click **Connect to Git** and select your `byapar` repository.
3. Configure build settings:
   - **Project Name:** `byapar-web`
   - **Framework Preset:** `Vite`
   - **Root Directory:** `/` (or leave empty)
   - **Build Command:** `pnpm --filter @byapar/web build`
   - **Build Output Directory:** `apps/web/dist`
4. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: `https://sovpldesvrdbmklpntrx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: *(Your Supabase project anon key)*
   - `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY`: *(Your Turnstile site key from Step 2)*
   - `VITE_EDGE_SHORTLINK_URL`: `https://pay.byapar.com` (or your worker URL)
5. Click **Save and Deploy**.
6. Under **Custom Domains**, add `app.byapar.com`. Cloudflare will automatically provision a free SSL/TLS certificate.

### B. Deploying Super Admin Portal (`admin.byapar.com`)
1. In Cloudflare Pages, click **Create Application > Pages > Connect to Git**.
2. Configure build settings:
   - **Project Name:** `byapar-admin`
   - **Build Command:** `pnpm --filter @byapar/admin build`
   - **Build Output Directory:** `apps/admin/dist`
3. Add environment variables:
   - `VITE_SUPABASE_URL`: `https://sovpldesvrdbmklpntrx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: *(Your Supabase project anon key)*
   - `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY`: *(Your Turnstile site key)*
4. Under **Custom Domains**, assign `admin.byapar.com`.

---

## 2. Cloudflare Turnstile (Anti-Bot & Brute-Force Auth Protection)

Turnstile protects login and signup endpoints from automated credential stuffing and bot spam without frustrating users with captcha image puzzles.

### A. Generating Turnstile Keys
1. In Cloudflare Dashboard, go to **Turnstile** in the left sidebar.
2. Click **Add Widget**:
   - **Widget Name:** `Byapar Auth Shield`
   - **Domain:** Add `app.byapar.com`, `admin.byapar.com`, and `localhost` (for local development).
   - **Widget Mode:** `Managed` (Cloudflare automatically decides whether an invisible or interactive check is required).
3. Copy the **Site Key** and **Secret Key**.
4. In your `.env` (or Cloudflare Pages environment variables):
   ```env
   VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=0x4AAAAAA...your_site_key_here...
   ```
> **Note:** During local development or if this variable is not set, Byapar automatically falls back to Cloudflare's official testing key (`1x00000000000000000000AA`), which always passes.

---

## 3. Cloudflare Zero Trust Access (Super Admin Lockdown)

Cloudflare Zero Trust allows you to put `admin.byapar.com` behind an email One-Time PIN (OTP) or Google Workspace authentication wall **before** an attacker can even view the admin page.

* **Free Quota:** Free for up to 50 users (indefinitely).

### Setup Steps:
1. Navigate to **Zero Trust** in the Cloudflare Dashboard.
2. Go to **Access > Applications > Add an application**.
3. Choose **Self-hosted**:
   - **Application Name:** `Byapar Super Admin`
   - **Application Domain:** `admin.byapar.com`
   - **Session Duration:** `24 hours`
4. In **Add Access Policy**:
   - **Policy Name:** `Admin Staff Only`
   - **Action:** `Allow`
   - **Rule Type:** `Include` -> `Emails` -> Add your official admin email addresses (e.g. `admin@byapar.com`, `founder@gmail.com`).
5. Save the application.
6. Now, whenever anyone visits `admin.byapar.com`, Cloudflare prompts for their email and sends a secure 6-digit PIN. Unlisted emails are completely blocked at Cloudflare's edge with HTTP 403.

---

## 4. Cloudflare Email Routing (Free Custom Business Email)

Set up official business email addresses on your custom domain with 100% free inbound forwarding to your personal Gmail or work inbox.

### Setup Steps:
1. In Cloudflare Dashboard, select your domain (`byapar.com`).
2. Go to **Email Routing > Get started**.
3. Cloudflare will automatically prompt you to add the required **MX and TXT (SPF) records** to your DNS. Click **Add records automatically**.
4. Under **Destination addresses**, click **Add destination address** and enter your personal email (e.g., `youremail@gmail.com`).
5. Check your Gmail inbox and click the verification link sent by Cloudflare.
6. Under **Routing rules**, create custom email addresses:
   - `support@byapar.com` → Forward to `youremail@gmail.com`
   - `billing@byapar.com` → Forward to `youremail@gmail.com`
   - `contact@byapar.com` → Forward to `youremail@gmail.com`
7. Click **Save**. Any email sent to these addresses now lands instantly in your inbox for $0/month.

---

## 5. Cloudflare D1 + Workers (Edge Invoice Shortlinks)

The `apps/edge-shortlinks` service runs on Cloudflare Workers and Cloudflare D1 (Serverless SQLite). It generates compact short links (`pay.byapar.com/i/:slug`) and renders standalone digital receipts in **<15ms** without hitting the Supabase PostgreSQL database.

* **Free Quota:** 100,000 requests/day, 5 Million D1 row reads/day.

### Deployment Instructions:
```bash
# 1. Navigate to the edge service directory
cd apps/edge-shortlinks

# 2. Login to Cloudflare Wrangler CLI (if not already logged in)
npx wrangler login

# 3. Create the D1 database
npx wrangler d1 create byapar_shortlinks
```
Wrangler will output a `database_id`. Open `apps/edge-shortlinks/wrangler.toml` and update the `database_id`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "byapar_shortlinks"
database_id = "YOUR_D1_DATABASE_ID_HERE"
```

```bash
# 4. Initialize the database schema
npx wrangler d1 execute byapar_shortlinks --remote --file=./schema.sql

# 5. Deploy the worker to Cloudflare's edge
npx wrangler deploy
```

In Cloudflare Dashboard under **Workers & Pages > byapar-edge-shortlinks > Settings > Domains & Routes**, add a custom domain such as `pay.byapar.com`.

---

## 6. Cloudflare Cache Rules for R2 Receipts & Static Assets

To ensure receipt images and thumbnails load instantly without repeating S3 API calls:
1. In Cloudflare Dashboard, go to **Caching > Cache Rules > Create rule**.
2. **Rule Name:** `Cache Bill Receipts`
3. **When incoming requests match:**
   - Field: `URI Path`
   - Operator: `starts with`
   - Value: `/bill_images/`
4. **Cache eligibility:** Eligible for cache.
5. **Edge TTL:** `Override origin` -> `7 days`.
6. **Browser TTL:** `Respect origin`.
7. Click **Deploy**.
