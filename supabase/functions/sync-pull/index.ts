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
    const { business_id, last_pulled_at } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const since = last_pulled_at ? new Date(last_pulled_at).toISOString() : new Date(0).toISOString();

    // Fetch changes for items
    const { data: items } = await supabase
      .from("items")
      .select("*")
      .eq("business_id", business_id)
      .gt("updated_at", since);

    // Fetch changes for parties
    const { data: parties } = await supabase
      .from("parties")
      .select("*")
      .eq("business_id", business_id)
      .gt("updated_at", since);

    // Fetch changes for invoices
    const { data: invoices } = await supabase
      .from("invoices")
      .select("*, items:invoice_items(*)")
      .eq("business_id", business_id)
      .gt("updated_at", since);

    // Fetch changes for khata
    const { data: khata } = await supabase
      .from("khata_entries")
      .select("*")
      .eq("business_id", business_id)
      .gt("updated_at", since);

    return new Response(
      JSON.stringify({
        timestamp: Date.now(),
        changes: {
          items: {
            created: items?.filter((i: any) => !i.deleted_at) ?? [],
            updated: [],
            deleted: items?.filter((i: any) => i.deleted_at).map((i: any) => i.id) ?? [],
          },
          parties: {
            created: parties?.filter((p: any) => !p.deleted_at) ?? [],
            updated: [],
            deleted: parties?.filter((p: any) => p.deleted_at).map((p: any) => p.id) ?? [],
          },
          invoices: {
            created: invoices ?? [],
            updated: [],
            deleted: [],
          },
          khata_entries: {
            created: khata ?? [],
            updated: [],
            deleted: [],
          },
        },
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
