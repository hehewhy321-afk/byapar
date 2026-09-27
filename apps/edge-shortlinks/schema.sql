-- Cloudflare D1 SQL Schema for Byapar Branded Invoice Shortlinks
CREATE TABLE IF NOT EXISTS short_links (
  slug TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_phone TEXT,
  business_pan TEXT,
  business_address TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  invoice_id TEXT,
  bill_number TEXT,
  items_json TEXT, -- Serialized JSON array: [{ name, qty, rate, total }]
  subtotal REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  grand_total REAL NOT NULL,
  currency TEXT DEFAULT 'NPR',
  payment_mode TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'paid', -- 'paid' | 'due' | 'partial'
  qr_payload TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  click_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_short_links_created ON short_links(created_at);
CREATE INDEX IF NOT EXISTS idx_short_links_lookup ON short_links(business_id, invoice_id);
