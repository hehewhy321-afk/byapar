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
    const { trace_id, invoice_number, amount, status } = await req.json();

    if (status !== "SUCCESS") {
      return new Response(JSON.stringify({ error: "Payment failed or cancelled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update invoice status to 'paid'
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        paid_amount: amount,
        due_amount: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("invoice_number", invoice_number)
      .select()
      .single();

    if (invoiceError) {
      console.error("Error updating invoice:", invoiceError);
    }

    // Record Payment
    await supabase.from("payments").insert({
      invoice_id: invoice?.id,
      business_id: invoice?.business_id,
      party_id: invoice?.party_id,
      payment_mode: "fonepay_qr",
      amount: amount,
      reference_id: trace_id,
      payment_date_ad: new Date().toISOString().split("T")[0],
      payment_date_bs: invoice?.invoice_date_bs || "2081-05-28",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payment of Rs. ${amount} verified via Fonepay.`,
        trace_id,
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
