# Cloudflare Free Tier Production Setup & Operations Guide (2026 Edition)

This guide provides end-to-end instructions for deploying and configuring the **Cloudflare Free Tier** services for the **Byapar / Kirana** platform:
- **Cloudflare Pages**: Global Edge Hosting for Web App & Super Admin
- **Cloudflare Turnstile**: Smart Anti-Bot & Brute-Force Auth Shield
- **Cloudflare Zero Trust (Access)**: Super Admin Lockdown (50 Free Seats)
- **Cloudflare Email Routing**: Free Business Emails (`support@byapar.com`)
- **Cloudflare D1 + Workers**: Edge Branded Invoice Shortlinks (`pay.byapar.com/i/:slug`)
- **Cloudflare R2 CDN & Cache**: Zero-Cost Image Caching

---

## 1. Cloudflare Deployment (Web App & Super Admin)

Both `apps/web` and `apps/admin` are optimized for Cloudflare Pages and Cloudflare Workers Static Assets (`wrangler deploy`) with native SPA client routing (`not_found_handling = "single-page-application"` in `wrangler.toml`) and edge security/immutable caching (`_headers`).

> [!NOTE]
> Do NOT use `/* /index.html 200` in `_redirects` when deploying with Wrangler Static Assets. Cloudflare normalizes `.html` URLs and flags rewrite rules targeting `index.html` as recursive infinite loops (`code: 100324`). Instead, Cloudflare's native `not_found_handling = "single-page-application"` in `wrangler.toml` handles SPA 404 fallbacks cleanly.

### A. Deploying Merchant Web App (`app.byapar.com`)
1. In Cloudflare Dashboard, go to **Workers & Pages > Overview**.
2. Configure build settings:
   - **Framework Preset:** `Vite` (or `None`)
   - **Build Command:** `pnpm --filter @byapar/web build`
   - **Build Output Directory:** `apps/web/dist`
   - **Deploy Command (if prompted):** Leave empty (for Pages) OR `npx wrangler deploy --config apps/web/wrangler.toml` (for Workers)
3. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: `https://sovpldesvrdbmklpntrx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: *(Your Supabase project anon key)*
   - `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY`: *(Your Turnstile site key from Step 2)*
   - `VITE_EDGE_SHORTLINK_URL`: `https://pay.byapar.com` (or your worker URL)
4. Under **Custom Domains**, add `app.byapar.com`.

### B. Deploying Super Admin Portal (`admin.byapar.com`)
1. Configure build settings:
   - **Build Command:** `pnpm --filter @byapar/admin build`
   - **Build Output Directory:** `apps/admin/dist`
   - **Deploy Command (if prompted):** Leave empty OR `npx wrangler deploy --config apps/admin/wrangler.toml`
2. Add environment variables:
   - `VITE_SUPABASE_URL`: `https://sovpldesvrdbmklpntrx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: *(Your Supabase project anon key)*
   - `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY`: *(Your Turnstile site key)*
3. Under **Custom Domains**, assign `admin.byapar.com`.

---

## 2. Cloudflare Turnstile (Anti-Bot & Brute-Force Auth Protection)

Turnstile protects login and signup endpoints from automated credential stuffing and bot spam without frustrating users with captcha image puzzles.

### A. Generating Turnstile Keys (Works for All Sites)
1. In Cloudflare Dashboard, go to **Turnstile** in the left sidebar.
2. Click **Add Widget**:
   - **Widget Name:** `Byapar Auth Shield`
   - **Domains:** Add all domains where your apps run:
     - `localhost` (for local development on any port)
     - `127.0.0.1`
     - `*.workers.dev` (covers any worker deploy e.g. `byapar-web.*.workers.dev`, `byapar-admin.*.workers.dev`)
     - `*.pages.dev` (covers any Pages preview or branch deploy)
     - `app.byapar.com` and `admin.byapar.com` (if you add custom domains later)
   - **Widget Mode:** `Managed` (Cloudflare automatically decides whether an invisible or interactive check is required).
3. Click **Create**.
4. You will see two keys:
   - **Site Key** (Public): Starts with `0x4AAAAAA...`
   - **Secret Key** (Private): Used for backend validation if desired.
5. In your Cloudflare Project Settings (**Workers & Pages > byapar-web / byapar-admin > Settings > Variables and Secrets**) and local `.env`:
   ```env
   VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=0x4AAAAAA...your_site_key_here...
   ```
> [!TIP]
> **Zero-Config Test Mode:** If you do not set `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY`, Byapar automatically uses Cloudflare's official testing site key (`1x00000000000000000000AA`), which always passes on any domain and localhost without needing a Cloudflare account.

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
# 4. Initialize the database schema on Cloudflare D1
npx wrangler d1 execute byapar_shortlinks --remote --file=./schema.sql

# 5. Deploy the worker to Cloudflare's edge
npx wrangler deploy
```

Upon successful deploy, Wrangler outputs your free worker URL:
```
Uploaded byapar-edge-shortlinks
Published byapar-edge-shortlinks triggers:
  https://byapar-edge-shortlinks.<your-subdomain>.workers.dev
```

### 6. Connect Worker URL to Web App (No Custom Domain Needed)
Copy that URL (e.g. `https://byapar-edge-shortlinks.<your-subdomain>.workers.dev`) and set:
1. In Cloudflare Dashboard (**Workers & Pages > byapar-web > Settings > Variables and Secrets**):
   - Add variable: `VITE_EDGE_SHORTLINK_URL` = `https://byapar-edge-shortlinks.<your-subdomain>.workers.dev`
2. In local `.env` (`apps/web/.env`):
   ```env
   VITE_EDGE_SHORTLINK_URL=https://byapar-edge-shortlinks.<your-subdomain>.workers.dev
   ```
> Custom domains (like `pay.byapar.com`) are completely optional. The default `*.workers.dev` URL provides full edge speed, HTTPS certificates, shortlink redirection, and digital receipt rendering right out of the box.

---

## 7. Cloudflare Cache Rules for R2 Receipts & Static Assets

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
