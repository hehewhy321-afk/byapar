# Implementation Plan - Kirana: Offline-First MSME Business & Financial Management Platform

## 1. Executive Summary & Vision

The goal is to architect and build an industry-grade, offline-first business management platform (mobile app + desktop/web) tailored for Micro, Small, and Medium Enterprises (MSMEs) in Nepal and emerging South Asian markets, rivaling and surpassing platforms like **Karobar** and **Khatapana**.

The platform provides seamless digital bookkeeping (*khata*), real-time multi-tier inventory management, automated credit (*udharo*) recovery, IRD-compliant billing (CBMS), instant payment collection via Fonepay Dynamic QR and ConnectIPS, and OCR-powered receipt capture.

---

## 2. Brand Identity & Name Suggestions

| Name | Linguistic Meaning & Market Appeal | Target Domain / Tagline |
| :--- | :--- | :--- |
| **Kirana** (Workspace Folder) | Universal term for neighbourhood retail & grocery stores across South Asia. Instantly recognizable, friendly, grounded. | *Kirana: Tapaiko Digital Pasal Partner* |
| **Byapar** / **ByaparBox** | Nepali/Sanskrit for "Trade/Business". Professional, serious, suits both micro-merchants and wholesalers. | *Byapar: Smart Business, Simplified.* |
| **Lekha** (or **LekhaPlus**) | Nepali for "Accounting / Ledger". Modern, sleek, fintech-oriented. | *Lekha: Accurate Khata, Zero Hassle.* |
| **HisabKitab** | Everyday colloquial phrase for accounts and bookkeeping in Nepal. Maximum cultural affinity. | *HisabKitab: Smart Hisab, Surakshit Byapar.* |
| **KhataSathi** | "Khata Companion". Highly empathetic, builds trust with non-tech-savvy traditional merchants. | *KhataSathi: Tapaiko Bharpardo Saathi.* |

> **Recommendation**: **Kirana** (for retail focus) or **Byapar** (for broad retail + wholesale + services).

---

## 3. Core vs. Advanced vs. Killer Add-on Features

### A. Core Features (Baseline Parity with Karobar)
1. **Digital Khata (Customer & Supplier Ledger / Udharo)**:
   - Customer & Supplier profile management with contact sync.
   - Dual-entry credit recording: *Got (Liyo)* / *Gave (Diyo)*.
   - Transaction history with notes, image attachment of paper receipts, and voice memos.
   - Automated Net Balance calculation (Receivable vs. Payable).
2. **Sales, Purchases & Expense Tracking**:
   - Quick Cash Sales vs. Credit Sales.
   - Purchase entry with vendor bill tracking.
   - Category-wise expense logging (Rent, Utility, Staff, Logistics).
   - Multi-payment split: Cash, Bank, QR, Udharo.
3. **Smart Inventory & Stock Management**:
   - Item catalog with barcode/QR code scanning (mobile camera & USB scanner support).
   - Stock in / Stock out with low-stock alerts and out-of-stock sale prevention switches.
   - Multi-tier pricing: Maximum Retail Price (MRP), Wholesale Price, and Special Party-wise custom rates.
   - Inventory valuation options: FIFO (First In First Out) and Weighted Average Cost.
4. **Automated Financial Reporting (20+ Reports)**:
   - Daily Daybook, Profit & Loss (P&L), Balance Sheet, Cash Flow Summary.
   - Stock summary, GSTR/VAT-ready sales/purchase registers, Party statement reports (PDF & Excel export).
5. **Localization & Dual Calendar**:
   - **Bikram Sambat (BS 2081/2082)** and Gregorian (AD) calendar toggle.
   - Full Nepali and English language support with localized number formatting (e.g., `1,00,000`).

---

### B. Advanced Capabilities (Exceeding Karobar & Khatapana)
1. **Multi-Business & Multi-Staff Role-Based Access Control (RBAC)**:
   - Single owner can manage multiple companies/branches.
   - Granular staff roles: *Cashier* (can only issue bills), *Inventory Manager* (stock adjustments only), *Accountant* (reports & ledgers), *Admin* (full control).
   - **Transaction Date Lock**: Prevent staff from altering past records retroactively (crucial audit control).
2. **Offline-First Reactive Architecture**:
   - Works 100% without internet. All writes happen locally in milliseconds to SQLite via WatermelonDB.
   - Automatic background delta sync to Supabase when connectivity returns, with conflict resolution (LWW for text, transactional balancing for financials).
3. **Omni-Channel Customer Statements & Automated Debt Recovery**:
   - One-click WhatsApp, Viber, and SMS payment reminder notices with localized templates.
   - Public transaction link (magic web link) where customers can inspect their statement item-by-item and pay immediately.

---

### C. Killer Add-on Moats (The High-Conversion Growth Drivers)
1. **Fonepay Dynamic QR Integration**:
   - Point-of-Sale screen generates an on-the-fly Dynamic QR for the exact amount with unique transaction ID.
   - Customer scans via any mobile banking app; Webhook automatically verifies payment and updates invoice status to "PAID" instantly.
   - Audio notification ("Payment of Rs. 450 received via Fonepay") like PhonePe/Paytm Soundbox.
2. **ConnectIPS & NPI (National Payments Interface) for B2B Vendor Settlements**:
   - Direct interbank payout for supplier bills up to Rs. 1,00,000 (mobile) / 10,00,000 (web) right inside the app.
3. **AI / OCR Camera Bill Scanner**:
   - Snap a photo of a printed paper invoice or handwritten bill; on-device or edge OCR extracts Supplier Name, PAN, Date, Line Items, and Total, pre-filling the purchase entry in 2 seconds.
4. **IRD-Approved CBMS (Central Billing Monitoring System) Module**:
   - Built-in mode for VAT-registered businesses: generates compliant tax invoices with 9-digit PAN/VAT, 13% VAT calculations, and queues real-time sync with Nepal IRD CBMS APIs.
5. **Embedded Micro-Lending Readiness**:
   - Algorithmic credit scoring based on ledger cash-flow velocity and supplier settlement regularity, pre-qualifying merchants for unsecured working capital loans through partner commercial banks in Nepal.

---

## 4. Technical Architecture & Monorepo Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       CLIENT TIER (Offline-First)                       │
├──────────────────────────────────┬──────────────────────────────────────┤
│       MOBILE (iOS & Android)     │              DESKTOP / WEB           │
│       React Native / Expo        │           React (Vite) / Next.js     │
│   WatermelonDB + SQLite (Native) │    WatermelonDB (Worker + IndexedDB) │
└──────────────────────────────────┴──────────────────────────────────────┘
                                    │
                  Sync Protocol (JSON Delta Push/Pull)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       BACKEND TIER (Supabase)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  • Auth (GoTrue): Phone OTP (Nepal SMS) + Email + Staff Pin             │
│  • Database: PostgreSQL 15+ with Row Level Security (RLS)               │
│  • Realtime Engine: Instant sync broadcasts across merchant terminals   │
│  • Edge Functions (Deno): Fonepay webhook, IRD CBMS sync, OCR processing │
│  • Storage: S3-compatible bill photos, business logos, PDF exports     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Proposed Directory Layout for Repository:
```
kirana/
├── docs/
│   ├── PRD.md                         # Detailed Product Requirement Document
│   ├── System_design_&_architecture.md # End-to-end Architecture & Sync Engine
│   ├── features.md                    # Exhaustive Feature Matrix & Workflows
│   ├── database_schema_supabase.md    # Production Postgres Schema + RLS + Triggers
│   └── local_setup_guide.md           # Local Supabase & Dev Environment Runbook
├── apps/
│   ├── mobile/                        # React Native / Expo (WatermelonDB + SQLite)
│   └── web/                           # React (Vite) / Desktop Web App
├── packages/
│   ├── core/                          # Shared business logic, models, validators (Zod)
│   ├── database/                      # WatermelonDB schema and sync handlers
│   └── ui/                            # Shared design tokens and component kit
├── supabase/
│   ├── migrations/                    # SQL migrations for local & cloud Supabase
│   ├── functions/                     # Supabase Edge Functions (Fonepay, CBMS, Sync)
│   └── seed.sql                       # Sample seed data for rapid local testing
└── package.json
```

---

## 5. Planned Documentation Deliverables

We will create the following structured files in the `docs/` folder:

1. **`docs/PRD.md`**:
   - Executive Vision, Target Audience Personas (Shopkeeper, Wholesaler, Services), User Stories, Functional & Non-Functional Requirements, Regulatory & Compliance Constraints (IRD/VAT Act 2052), Monetization Strategy, and Success Metrics (DAU/MAU, Retention).
2. **`docs/System_design_&_architecture.md`**:
   - System Topology, Client-Side WatermelonDB Architecture, Sync Engine Specification (Batch Push/Pull, Idempotent UUIDs, LWW Conflict Resolution), Supabase Backend Components, Fonepay Dynamic QR Webhook Lifecycle, and CBMS Offline Queue Architecture.
3. **`docs/features.md`**:
   - Granular breakdown of 60+ features categorized into Core Bookkeeping, Inventory, CRM, Payments & Banking, Taxation & Compliance, Staff Management, and Growth/Virality loops.
4. **`docs/database_schema_supabase.md`**:
   - Complete PostgreSQL relational schema with Supabase Row Level Security (RLS) policies, indexes, audit triggers, and soft-delete/sync tracking (`created_at`, `updated_at`, `deleted_at`, `version`).
5. **`docs/local_setup_guide.md`**:
   - Practical developer guide to launch local Supabase via Docker, run migrations, seed dummy data, and setup the React/Expo development environment.

---

## 6. Open Questions & Review

1. **Brand Identity**: Do you prefer keeping **Kirana** as the project and product name, or do you want to explore alternatives like **Byapar** or **Lekha**?
2. **Web Framework**: Do you prefer **React + Vite** for the Web POS (ultra-fast, lightweight SPA ideal for POS terminals) or **Next.js** (supports SEO marketing landing pages + dashboard in one)?
3. **Next Steps Approval**: Upon your approval of this plan, we will generate the complete set of professional documentation in the `docs/` folder and prepare the project foundation.
