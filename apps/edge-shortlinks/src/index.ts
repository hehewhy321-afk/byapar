import { renderInvoiceHtml, InvoiceData } from './htmlTemplate';

export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  APP_ORIGIN: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function generateSlug(length = 7): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  let res = '';
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < length; i++) {
    res += chars[randomBytes[i] % chars.length];
  }
  return res;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 1. POST /api/shorten - Store invoice & generate shortlink
    if (request.method === 'POST' && url.pathname === '/api/shorten') {
      try {
        const body = await request.json() as any;
        if (!body.business_name || body.grand_total === undefined) {
          return new Response(JSON.stringify({ error: 'Missing business_name or grand_total' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }

        const slug = generateSlug();
        const now = Date.now();
        const itemsJson = JSON.stringify(body.items || []);

        await env.DB.prepare(`
          INSERT INTO short_links (
            slug, business_id, business_name, business_phone, business_pan, business_address,
            customer_name, customer_phone, invoice_id, bill_number, items_json,
            subtotal, tax_amount, discount_amount, grand_total, currency,
            payment_mode, payment_status, qr_payload, created_at, click_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).bind(
          slug,
          body.business_id || '',
          body.business_name,
          body.business_phone || null,
          body.business_pan || null,
          body.business_address || null,
          body.customer_name || null,
          body.customer_phone || null,
          body.invoice_id || null,
          body.bill_number || null,
          itemsJson,
          Number(body.subtotal) || 0,
          Number(body.tax_amount) || 0,
          Number(body.discount_amount) || 0,
          Number(body.grand_total) || 0,
          body.currency || 'NPR',
          body.payment_mode || 'cash',
          body.payment_status || 'paid',
          body.qr_payload || null,
          now
        ).run();

        const shortUrl = `${url.origin}/i/${slug}`;
        const redirectUrl = `${url.origin}/r/${slug}`;

        return new Response(
          JSON.stringify({
            success: true,
            slug,
            short_url: shortUrl,
            redirect_url: redirectUrl,
          }),
          {
            status: 201,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      } catch (err: any) {
        console.error('Error generating short link:', err);
        return new Response(JSON.stringify({ error: 'Failed to create short link', details: err.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // 2. GET /i/:slug - Render Standalone Edge Digital Invoice
    if (request.method === 'GET' && url.pathname.startsWith('/i/')) {
      const slug = url.pathname.slice(3).trim();
      if (!slug) {
        return new Response('Not Found', { status: 404 });
      }

      const row = await env.DB.prepare(
        'SELECT * FROM short_links WHERE slug = ?'
      ).bind(slug).first<any>();

      if (!row) {
        return new Response(
          `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Invoice Not Found</h2><p>This bill link may have expired or is invalid.</p><a href="${env.APP_ORIGIN}">Return to Byapar</a></body></html>`,
          {
            status: 404,
            headers: { 'Content-Type': 'text/html; charset=UTF-8' },
          }
        );
      }

      // Background click counter increment (Zero latency impact to user)
      ctx.waitUntil(
        env.DB.prepare('UPDATE short_links SET click_count = click_count + 1 WHERE slug = ?')
          .bind(slug)
          .run()
          .catch((e) => console.warn('Failed to increment click count:', e))
      );

      let items = [];
      try {
        items = JSON.parse(row.items_json || '[]');
      } catch (_) {}

      const invoiceData: InvoiceData = {
        slug: row.slug,
        business_name: row.business_name,
        business_phone: row.business_phone,
        business_pan: row.business_pan,
        business_address: row.business_address,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
        bill_number: row.bill_number,
        items,
        subtotal: row.subtotal,
        tax_amount: row.tax_amount,
        discount_amount: row.discount_amount,
        grand_total: row.grand_total,
        currency: row.currency || 'NPR',
        payment_mode: row.payment_mode || 'cash',
        payment_status: row.payment_status || 'paid',
        created_at: row.created_at,
        qr_payload: row.qr_payload,
      };

      const html = renderInvoiceHtml(invoiceData, env.APP_ORIGIN || 'https://app.byapar.com');
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': 'public, max-age=60, s-maxage=300',
        },
      });
    }

    // 3. GET /r/:slug - Instant 302 Redirect to Web App
    if (request.method === 'GET' && url.pathname.startsWith('/r/')) {
      const slug = url.pathname.slice(3).trim();
      const row = await env.DB.prepare(
        'SELECT invoice_id, business_id FROM short_links WHERE slug = ?'
      ).bind(slug).first<any>();

      if (!row || !row.invoice_id) {
        return Response.redirect(env.APP_ORIGIN || 'https://app.byapar.com', 302);
      }

      const target = `${env.APP_ORIGIN}?view_invoice=${row.invoice_id}&biz=${row.business_id}`;
      return Response.redirect(target, 302);
    }

    // 4. GET /api/stats/:slug - Click analytics
    if (request.method === 'GET' && url.pathname.startsWith('/api/stats/')) {
      const slug = url.pathname.slice(11).trim();
      const row = await env.DB.prepare(
        'SELECT slug, click_count, created_at, grand_total FROM short_links WHERE slug = ?'
      ).bind(slug).first<any>();

      if (!row) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, stats: row }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ service: 'Byapar Edge Shortlinks Worker', status: 'healthy', version: '2026.1' }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  },
};
