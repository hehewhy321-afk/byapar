import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
declare const Deno: any;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { business_id, changes } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const acknowledgedIds: string[] = [];

    // Push Invoices
    if (changes.invoices?.created?.length) {
      for (const inv of changes.invoices.created) {
        const { items: invoiceItems, ...invoiceData } = inv;
        await supabase.from("invoices").upsert({
          ...invoiceData,
          business_id,
        });
        acknowledgedIds.push(inv.id);
      }
    }

    // Push Khata Entries
    if (changes.khata_entries?.created?.length) {
      for (const entry of changes.khata_entries.created) {
        await supabase.from("khata_entries").upsert({
          ...entry,
          business_id,
        });
        acknowledgedIds.push(entry.id);
      }
    }

    // Push Items
    if (changes.items?.created?.length) {
      for (const it of changes.items.created) {
        await supabase.from("items").upsert({
          ...it,
          business_id,
        });
        acknowledgedIds.push(it.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced_at: Date.now(),
        acknowledged_ids: acknowledgedIds,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
