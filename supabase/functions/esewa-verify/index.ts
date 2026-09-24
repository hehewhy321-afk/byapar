import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// @ts-ignore
declare const Deno: any;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    let { data: encodedData, transaction_uuid, product_code, total_amount, transaction_code } = body;

    // If encodedData is passed from eSewa redirect URL ?data=...
    if (encodedData) {
      try {
        const decodedStr = atob(encodedData);
        const parsed = JSON.parse(decodedStr);
        transaction_uuid = transaction_uuid || parsed.transaction_uuid;
        product_code = product_code || parsed.product_code;
        total_amount = total_amount || parsed.total_amount;
        transaction_code = transaction_code || parsed.transaction_code;
      } catch (decErr) {
        console.warn("Failed to decode base64 data:", decErr);
      }
    }

    if (!transaction_uuid) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing transaction_uuid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    product_code = product_code || "EPAYTEST";

    // 1. Look up pending transaction in DB
    const { data: txn, error: txnErr } = await supabase
      .from("subscription_transactions")
      .select("*")
      .eq("transaction_uuid", transaction_uuid)
      .single();

    if (txnErr || !txn) {
      return new Response(
        JSON.stringify({ success: false, error: `Transaction ${transaction_uuid} not found in database` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    total_amount = total_amount || txn.amount.toString();

    // 2. Query eSewa Status Inquiry API
    const isUat = product_code === "EPAYTEST";
    const statusApiUrl = isUat
      ? `https://rc.esewa.com.np/api/epay/transaction/status/?product_code=${product_code}&total_amount=${total_amount}&transaction_uuid=${transaction_uuid}`
      : `https://epay.esewa.com.np/api/epay/transaction/status/?product_code=${product_code}&total_amount=${total_amount}&transaction_uuid=${transaction_uuid}`;

    console.log(`Checking eSewa status for ${transaction_uuid} at:`, statusApiUrl);

    let esewaStatus = "NOT_FOUND";
    let esewaRefId = transaction_code || "";

    try {
      const res = await fetch(statusApiUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        console.log("eSewa Status API Response:", data);
        esewaStatus = data.status || "UNKNOWN";
        if (data.ref_id) esewaRefId = data.ref_id;
      } else {
        console.warn("eSewa Status API HTTP error:", res.status);
      }
    } catch (fetchErr) {
      console.error("eSewa Status API fetch error:", fetchErr);
    }

    // Also support sandbox test mode verification if UAT payment
    const isSuccess = esewaStatus === "COMPLETE" || (isUat && (body.is_demo_confirmation || body.force_sandbox));

    if (!isSuccess) {
      await supabase
        .from("subscription_transactions")
        .update({
          status: "failed",
          gateway_response: { esewaStatus, checked_at: new Date().toISOString() },
        })
        .eq("id", txn.id);

      return new Response(
        JSON.stringify({
          success: false,
          status: esewaStatus,
          error: `eSewa transaction verification failed (Status: ${esewaStatus})`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const completedTxnCode = esewaRefId || transaction_code || `ESEWA-${Date.now()}`;
    const now = new Date();
    const durationDays = txn.billing_cycle === "annual" ? 365 : 30;
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // 3. Mark transaction completed
    await supabase
      .from("subscription_transactions")
      .update({
        status: "completed",
        transaction_code: completedTxnCode,
        completed_at: now.toISOString(),
        gateway_response: {
          esewaStatus: "COMPLETE",
          ref_id: completedTxnCode,
          verified_at: now.toISOString(),
        },
      })
      .eq("id", txn.id);

    // 4. Update Business Subscription Tier
    await supabase
      .from("businesses")
      .update({
        subscription_tier: txn.plan_tier,
        subscription_status: "active",
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq("id", txn.business_id);

    // 5. Insert history into subscriptions table
    await supabase.from("subscriptions").insert({
      business_id: txn.business_id,
      plan_tier: txn.plan_tier,
      billing_cycle: txn.billing_cycle,
      status: "active",
      price: txn.amount,
      currency: "NPR",
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: expiresAt.toISOString(),
      auto_renew: false,
    });

    // 6. Record promo usage if promo code was used
    if (txn.promo_code) {
      await supabase.rpc("increment_promo_code_redemption", { p_code: txn.promo_code }).catch(async () => {
        const { data: promo } = await supabase
          .from("promo_codes")
          .select("redemptions_count")
          .eq("code", txn.promo_code)
          .single();
        if (promo) {
          await supabase
            .from("promo_codes")
            .update({ redemptions_count: (promo.redemptions_count || 0) + 1 })
            .eq("code", txn.promo_code);
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "eSewa Payment Verified & Subscription Upgraded!",
        transaction_code: completedTxnCode,
        plan_tier: txn.plan_tier,
        expires_at: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("esewa-verify unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
