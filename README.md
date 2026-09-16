# Byapar (व्यापार) - Smart MSME Business Management Ecosystem

> **Offline-First Digital Bookkeeping, Smart POS, Multi-Tier Inventory & Integrated Fintech for Nepal & South Asia**

---

## 🌟 Executive Summary

**Byapar (व्यापार)** is an industry-grade, offline-first business management platform designed specifically for Micro, Small, and Medium Enterprises (MSMEs) in Nepal. It combines intuitive vernacular bookkeeping (*Liyo / Diyo Khata*), sub-16ms Point-of-Sale billing, real-time inventory tracking, and deep fintech integrations (Fonepay Dynamic QR with instant voice soundbox, ConnectIPS/NPI vendor payouts, and IRD CBMS tax compliance).

The platform is designed to operate seamlessly across **Web / Desktop POS** (powered by **SolidJS v2**) and **Mobile** (powered by **React Native / Expo**), backed by a local-first **Supabase** (PostgreSQL) architecture.

---

## 📚 Complete Engineering & Product Documentation

All exhaustive specifications, system designs, schemas, and developer manuals are located in the [`docs/`](./docs) directory:

| Document | Description | Key Highlights |
| :--- | :--- | :--- |
| **[`docs/PRD.md`](./docs/PRD.md)** | **Product Requirements Document** | Personas (Ramesh, Sita, Bikash), User Stories, IRD/CBMS compliance, OKRs, Release horizons. |
| **[`docs/System_design_&_architecture.md`](./docs/System_design_&_architecture.md)** | **System Design & Architecture** | Offline-first reactive topology, SolidJS v2 Web POS, Edge Functions, Fonepay Dynamic QR lifecycle, IRD Outbox. |
| **[`docs/features.md`](./docs/features.md)** | **Feature Matrix (60+ Features)** | Core Khata, Fast Billing, Inventory, Multi-Staff RBAC, Soundbox audio alert, ConnectIPS B2B transfers, Competitive analysis. |
| **[`docs/database_schema_supabase.md`](./docs/database_schema_supabase.md)** | **Supabase PostgreSQL Schema** | DDL tables, custom Enums, high-performance sync indexes, Row Level Security (RLS) tenant isolation policies. |
| **[`docs/offline_sync_spec.md`](./docs/offline_sync_spec.md)** | **Data Sync & Conflict Engine** | JSON push/pull wire formats, Last-Write-Wins (LWW), delta increment rules, Bikram Sambat (BS) date engine. |
| **[`docs/local_setup_guide.md`](./docs/local_setup_guide.md)** | **Developer Runbook & Local Setup** | Docker + Supabase CLI local orchestration, SolidJS Vite environment, mock payment simulation, daily commands. |

---

## 🛠️ Technology Stack Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND CLIENTS (Offline-First)                │
├───────────────────────────────────┬────────────────────────────────────┤
│   DESKTOP / WEB POS (SolidJS v2)  │    MOBILE (React Native / Expo)    │
│   • Fine-grained Reactive Signals │    • Native C++ SQLite Bridge      │
│   • Sub-millisecond DOM updates   │    • WatermelonDB Lazy Loading     │
│   • WebUSB Thermal ESC/POS Print  │    • Camera Barcode / OCR Scanner  │
└───────────────────────────────────┴────────────────────────────────────┘
                                    │
                  Sync Protocol (JSON Delta Push/Pull)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND TIER (Supabase)                         │
├────────────────────────────────────────────────────────────────────────┤
│   • Auth (GoTrue): Phone OTP (Nepal SMS) + Email + Staff PIN           │
│   • PostgreSQL 15+: Row Level Security (RLS) multi-tenant partitions   │
│   • Realtime (WebSockets): Live terminal cross-sync & soundbox events  │
│   • Edge Functions (Deno): Fonepay Webhook, CBMS Outbox, OCR Ingestion │
│   • Storage: S3-compatible compressed receipt vouchers & logos        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+ or 20+ LTS
- Docker Desktop (running)
- Supabase CLI (`npm install -g supabase`)

### 2. Launch Local Backend
```bash
# Start local Supabase containers (PostgreSQL, Auth, Storage, Studio)
npx supabase start

# Access the local Supabase Studio Dashboard at:
# http://127.0.0.1:54323
```

### 3. Launch Web POS (SolidJS v2)
```bash
cd apps/web
pnpm install
pnpm dev
# Open http://localhost:5173
```

Refer to [`docs/local_setup_guide.md`](./docs/local_setup_guide.md) for full setup instructions and simulation testing.
