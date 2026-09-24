// @ts-nocheck
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
    let transaction_uuid =
      body.transaction_uuid ||
      body.transactionUuid ||
      body.transactionId ||
      body.uuid ||
      null;

    if (transaction_uuid && typeof transaction_uuid === "string") {
      transaction_uuid = transaction_uuid.split("?")[0].split("&")[0].trim();
    }

    let {
      action = "verify",
      data: encodedData,
      product_code,
      total_amount,
      transaction_code,
      reason,
      business_id,
      businessId,
    } = body;

    const bizId = business_id || businessId || null;

    let parsedDataStatus: string | null = null;
    let parsedRefId: string | null = null;
    let esewaRawResponse: any = {};

    // Decode base64 data if passed from eSewa redirect URL ?data=...
    if (encodedData && typeof encodedData === "string" && encodedData.trim()) {
      try {
        // Normalize URL-safe base64
        const normalized = encodedData.replace(/-/g, "+").replace(/_/g, "/");
        const pad = normalized.length % 4;
        const padded = pad ? normalized + "=".repeat(4 - pad) : normalized;
        const decodedStr = atob(padded);
        const parsed = JSON.parse(decodedStr);
        esewaRawResponse = { ...parsed };
        parsedDataStatus = parsed.status || null;
        parsedRefId = parsed.transaction_code || parsed.ref_id || null;
        if (parsed.transaction_uuid) {
          transaction_uuid = String(parsed.transaction_uuid).split("?")[0].split("&")[0].trim();
        } else if (parsed.transactionUuid) {
          transaction_uuid = String(parsed.transactionUuid).split("?")[0].split("&")[0].trim();
        }
        product_code = product_code || parsed.product_code;
        total_amount = total_amount || parsed.total_amount;
        transaction_code = transaction_code || parsed.transaction_code || parsed.ref_id;
        if (parsed.status === "CANCELED" || parsed.status === "CANCELLED") {
          action = "cancel";
        }
      } catch (decErr) {
        console.warn("Failed to decode base64 data:", decErr);
      }
    }

    // Fallback: If transaction_uuid still missing but business_id provided, find latest pending transaction
    if (!transaction_uuid && bizId) {
      const { data: latestPending } = await supabase
        .from("subscription_transactions")
        .select("transaction_uuid, amount, plan_tier")
        .eq("business_id", bizId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestPending?.transaction_uuid) {
        transaction_uuid = latestPending.transaction_uuid;
        total_amount = total_amount || latestPending.amount?.toString();
      }
    }

    if (!transaction_uuid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing transaction_uuid. Please provide transaction_uuid or business_id.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    product_code = product_code || "EPAYTEST";

    // 1. Look up transaction in DB
    const { data: txn, error: txnErr } = await supabase
      .from("subscription_transactions")
      .select("*")
      .eq("transaction_uuid", transaction_uuid)
      .maybeSingle();

    if (txnErr || !txn) {
      return new Response(
        JSON.stringify({ success: false, error: `Transaction ${transaction_uuid} not found in database` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotent check: if already completed, return success
    if (action === "verify" && txn.status === "completed") {
      return new Response(
        JSON.stringify({
          success: true,
          status: "completed",
          message: "Transaction already completed and subscription active.",
          transaction_uuid,
          plan_tier: txn.plan_tier,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // ACTION: CANCEL
    // =========================================================================
    if (action === "cancel") {
      const cancelReason = reason || "Payment cancelled on eSewa gateway";
      const nowIso = new Date().toISOString();

      await supabase
        .from("subscription_transactions")
        .update({
          status: "cancelled",
          gateway_response: {
            status: "CANCELLED",
            reason: cancelReason,
            cancelled_at: nowIso,
            checked_via: "api",
          },
        })
        .eq("id", txn.id);

      return new Response(
        JSON.stringify({
          success: true,
          status: "cancelled",
          message: "Transaction marked as cancelled successfully.",
          transaction_uuid,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // ACTION: VERIFY or CHECK_STATUS
    // =========================================================================
    total_amount = total_amount || txn.amount.toString();
    const cleanAmount = Number(total_amount.toString().replace(/,/g, "")).toString();

    // Query eSewa Status Inquiry API
    const isUat = product_code === "EPAYTEST";
    const statusApiUrl = isUat
      ? `https://rc-epay.esewa.com.np/api/epay/transaction/status/?product_code=${product_code}&total_amount=${cleanAmount}&transaction_uuid=${encodeURIComponent(transaction_uuid)}`
      : `https://epay.esewa.com.np/api/epay/transaction/status/?product_code=${product_code}&total_amount=${cleanAmount}&transaction_uuid=${encodeURIComponent(transaction_uuid)}`;

    console.log(`Checking eSewa status for ${transaction_uuid} at:`, statusApiUrl);

    let esewaStatus = parsedDataStatus === "COMPLETE" ? "COMPLETE" : "NOT_FOUND";
    let esewaRefId = parsedRefId || transaction_code || "";

    try {
      const res = await fetch(statusApiUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        console.log("eSewa Status API Response:", data);
        esewaRawResponse = { ...esewaRawResponse, ...data };
        if (data.status) {
          esewaStatus = data.status;
        }
        if (data.ref_id) esewaRefId = data.ref_id;
      } else {
        console.warn("eSewa Status API HTTP status:", res.status);
      }
    } catch (fetchErr) {
      console.error("eSewa Status API fetch error:", fetchErr);
    }

    // If eSewa explicitly returned CANCELED / CANCELLED
    if (esewaStatus === "CANCELED" || esewaStatus === "CANCELLED" || parsedDataStatus === "CANCELED") {
      await supabase
        .from("subscription_transactions")
        .update({
          status: "cancelled",
          gateway_response: {
            ...esewaRawResponse,
            status: "CANCELLED",
            reason: "eSewa confirmed transaction was cancelled",
            cancelled_at: new Date().toISOString(),
          },
        })
        .eq("id", txn.id);

      return new Response(
        JSON.stringify({
          success: false,
          status: "cancelled",
          message: "Transaction was cancelled by user on eSewa.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check authentic success condition:
    // 1. Status API returned COMPLETE
    // 2. OR parsed signed redirect data from eSewa returned COMPLETE
    const isSuccess = esewaStatus === "COMPLETE" || parsedDataStatus === "COMPLETE";

    if (isSuccess && esewaStatus !== "COMPLETE") {
      esewaStatus = "COMPLETE";
    }

    if (!isSuccess) {
      const finalStatus =
        esewaStatus === "FAILED"
          ? "failed"
          : esewaStatus === "PENDING"
          ? "pending"
          : "failed";

      await supabase
        .from("subscription_transactions")
        .update({
          status: finalStatus,
          gateway_response: {
            ...esewaRawResponse,
            esewaStatus,
            checked_at: new Date().toISOString(),
          },
        })
        .eq("id", txn.id);

      return new Response(
        JSON.stringify({
          success: false,
          status: finalStatus,
          error: `eSewa transaction verification: status is ${esewaStatus}`,
          details: esewaRawResponse,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SUCCESS: Complete transaction & upgrade subscription
    const completedTxnCode = esewaRefId || transaction_code || `ESEWA-${Date.now()}`;
    const now = new Date();
    const durationDays = txn.billing_cycle === "annual" ? 365 : 30;
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // 1. Mark transaction completed with eSewa audit details
    await supabase
      .from("subscription_transactions")
      .update({
        status: "completed",
        transaction_code: completedTxnCode,
        completed_at: now.toISOString(),
        gateway_response: {
          ...esewaRawResponse,
          esewaStatus: "COMPLETE",
          ref_id: completedTxnCode,
          verified_at: now.toISOString(),
        },
      })
      .eq("id", txn.id);

    // 2. Update Business table
    await supabase
      .from("businesses")
      .update({
        subscription_tier: txn.plan_tier,
        subscription_status: "active",
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq("id", txn.business_id);

    // 3. Upsert into subscriptions table (update existing or insert new)
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("business_id", txn.business_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSub) {
      await supabase
        .from("subscriptions")
        .update({
          plan_tier: txn.plan_tier,
          billing_cycle: txn.billing_cycle,
          status: "active",
          price: txn.amount,
          currency: "NPR",
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          current_period_start: now.toISOString(),
          current_period_end: expiresAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", existingSub.id);
    } else {
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
    }

    // 4. Record promo code usage if applicable
    if (txn.promo_code) {
      try {
        await supabase.rpc("increment_promo_code_redemption", { p_code: txn.promo_code });
      } catch {
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
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "eSewa Payment Verified & Subscription Upgraded!",
        transaction_code: completedTxnCode,
        plan_tier: txn.plan_tier,
        expires_at: expiresAt.toISOString(),
        status: "completed",
        ref_id: completedTxnCode,
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
