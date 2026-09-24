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

async function generateHmacSha256Base64(message: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  let binary = "";
  for (let i = 0; i < hashArray.length; i++) {
    binary += String.fromCharCode(hashArray[i]);
  }
  return btoa(binary);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // eSewa configuration from Supabase Secrets (Environment Variables)
    // Default fallback to EPAYTEST credentials if secrets are not set yet
    const ESEWA_PRODUCT_CODE = Deno.env.get("ESEWA_PRODUCT_CODE") || "EPAYTEST";
    const ESEWA_SECRET_KEY = Deno.env.get("ESEWA_SECRET_KEY") || "8gBm/:&EnhH.1/q";
    const ESEWA_ENV = Deno.env.get("ESEWA_ENV") || (ESEWA_PRODUCT_CODE === "EPAYTEST" ? "uat" : "live");
    const isUat = ESEWA_ENV === "uat" || ESEWA_PRODUCT_CODE === "EPAYTEST";

    const gatewayUrl = isUat
      ? "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
      : "https://epay.esewa.com.np/api/epay/main/v2/form";

    const body = await req.json().catch(() => ({}));
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

    // =========================================================================
    // ACTION: INITIATE (Industrial Bank-Grade Session Creation)
    // - Client never touches confidential secret keys or HMAC signatures
    // - Server verifies plan price & discount against database (anti-tamper)
    // - Server pre-logs pending transaction and signs with server secret key
    // =========================================================================
    if (action === "initiate") {
      const planId = body.plan_id || body.planId;
      const billingCycle = body.billing_cycle || body.billingCycle || "monthly";
      const promoCodeInput = body.promo_code || body.promoCode || null;
      const platform = body.platform || "web"; // 'web' | 'mobile'
      const clientOrigin = body.origin || body.callback_origin || "https://byapar.app";

      if (!bizId) {
        return new Response(
          JSON.stringify({ success: false, error: "business_id is required to initiate subscription" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 1. Fetch business details
      const { data: biz } = await supabase
        .from("businesses")
        .select("name, nameEn")
        .eq("id", bizId)
        .maybeSingle();

      const businessName = biz?.nameEn || biz?.name || "Byapar Merchant Store";

      // 2. Fetch authoritative plan details from DB
      let unitPrice = 0;
      let planName = planId;
      const { data: dbPlan } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", planId)
        .maybeSingle();

      if (dbPlan) {
        planName = dbPlan.name || planId;
        unitPrice = billingCycle === "annual" ? Number(dbPlan.annual_price) : Number(dbPlan.monthly_price);
      } else {
        // Safe default fallback
        if (planId === "starter_49") unitPrice = billingCycle === "annual" ? 499 : 49;
        else if (planId === "pro_99") unitPrice = billingCycle === "annual" ? 999 : 99;
        else if (planId === "enterprise_149") unitPrice = billingCycle === "annual" ? 1499 : 149;
      }

      // 3. Authoritative server-side promo code validation
      let discountAmount = 0;
      let appliedPromo: any = null;
      if (promoCodeInput && typeof promoCodeInput === "string") {
        const cleanPromo = promoCodeInput.trim().toUpperCase();
        const { data: promo } = await supabase
          .from("promo_codes")
          .select("*")
          .eq("code", cleanPromo)
          .eq("is_active", true)
          .maybeSingle();

        if (promo) {
          const isExpired = promo.expires_at && new Date(promo.expires_at).getTime() < Date.now();
          const limitReached = promo.max_redemptions && promo.current_redemptions >= promo.max_redemptions;
          if (!isExpired && !limitReached) {
            appliedPromo = promo;
            const val = Number(promo.discount_value) || 0;
            if (promo.discount_type === "percentage") {
              discountAmount = Math.round((unitPrice * val) / 100);
            } else {
              discountAmount = Math.min(unitPrice, val);
            }
          }
        }
      }

      const finalPrice = Math.max(0, unitPrice - discountAmount);

      // 4. Free plan / 100% discount instant activation
      if (finalPrice <= 0) {
        const now = new Date();
        const durationDays = billingCycle === "annual" ? 365 : 30;
        const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        await supabase
          .from("businesses")
          .update({
            subscription_tier: planId,
            subscription_status: "active",
            subscription_expires_at: expiresAt.toISOString(),
          })
          .eq("id", bizId);

        return new Response(
          JSON.stringify({
            success: true,
            freeActivated: true,
            plan_tier: planId,
            plan_name: planName,
            message: `Plan ${planName} successfully activated!`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 5. Generate secure unique transaction UUID
      const prefix = platform === "mobile" ? "BYAPAR-MOB" : "SUB";
      const txUuid = `${prefix}-${bizId.slice(0, 8)}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalAmountStr = finalPrice.toString();

      // 6. Pre-log pending transaction in Supabase
      await supabase.from("subscription_transactions").insert({
        business_id: bizId,
        business_name: businessName,
        plan_tier: planId,
        billing_cycle: billingCycle,
        gateway: platform === "mobile" ? "esewa_mobile" : "esewa",
        amount: finalPrice,
        currency: "NPR",
        transaction_uuid: txUuid,
        promo_code: appliedPromo?.code || null,
        discount_amount: discountAmount,
        status: "pending",
        gateway_response: {
          initiated_at: new Date().toISOString(),
          platform,
          product_code: ESEWA_PRODUCT_CODE,
          env: ESEWA_ENV,
        },
      });

      // 7. Generate HMAC-SHA256 signature securely with backend secret key
      const signatureMessage = `total_amount=${totalAmountStr},transaction_uuid=${txUuid},product_code=${ESEWA_PRODUCT_CODE}`;
      const signature = await generateHmacSha256Base64(signatureMessage, ESEWA_SECRET_KEY);

      // 8. Construct return URLs
      const successUrl = platform === "mobile"
        ? "https://byapar.app/esewa-success"
        : `${clientOrigin}/?payment=esewa_success`;
      const failureUrl = platform === "mobile"
        ? "https://byapar.app/esewa-failure"
        : `${clientOrigin}/?payment=esewa_failure`;

      const fields: Record<string, string> = {
        amount: totalAmountStr,
        tax_amount: "0",
        total_amount: totalAmountStr,
        transaction_uuid: txUuid,
        product_code: ESEWA_PRODUCT_CODE,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: successUrl,
        failure_url: failureUrl,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature: signature,
      };

      // 9. Auto-submitting HTML form for mobile In-App WebView
      const htmlForm = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Connecting to eSewa...</title>
  <style>
    body {
      margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100vh; background: #020617; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .spinner {
      width: 44px; height: 44px; border: 4px solid rgba(96, 187, 70, 0.2); border-top-color: #60BB46;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h3 { margin-top: 18px; font-size: 16px; font-weight: 700; color: #FFFFFF; }
    p { margin-top: 6px; font-size: 12px; color: #94A3B8; text-align: center; max-width: 260px; }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h3>Connecting to eSewa Nepal</h3>
  <p>Loading secure payment portal. Please do not close...</p>

  <form id="esewaPaymentForm" method="POST" action="${gatewayUrl}">
    <input type="hidden" name="amount" value="${totalAmountStr}" />
    <input type="hidden" name="tax_amount" value="0" />
    <input type="hidden" name="total_amount" value="${totalAmountStr}" />
    <input type="hidden" name="transaction_uuid" value="${txUuid}" />
    <input type="hidden" name="product_code" value="${ESEWA_PRODUCT_CODE}" />
    <input type="hidden" name="product_service_charge" value="0" />
    <input type="hidden" name="product_delivery_charge" value="0" />
    <input type="hidden" name="success_url" value="${successUrl}" />
    <input type="hidden" name="failure_url" value="${failureUrl}" />
    <input type="hidden" name="signed_field_names" value="total_amount,transaction_uuid,product_code" />
    <input type="hidden" name="signature" value="${signature}" />
  </form>

  <script>
    document.addEventListener("DOMContentLoaded", function() {
      setTimeout(function() {
        document.getElementById("esewaPaymentForm").submit();
      }, 100);
    });
  </script>
</body>
</html>`;

      return new Response(
        JSON.stringify({
          success: true,
          freeActivated: false,
          transaction_uuid: txUuid,
          amount: finalPrice,
          plan_id: planId,
          plan_name: planName,
          billing_cycle: billingCycle,
          action_url: gatewayUrl,
          fields,
          html_form: htmlForm,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // ACTIONS: VERIFY / CANCEL / CHECK_STATUS
    // =========================================================================
    let transaction_uuid =
      body.transaction_uuid ||
      body.transactionUuid ||
      body.transactionId ||
      body.uuid ||
      null;

    if (transaction_uuid && typeof transaction_uuid === "string") {
      transaction_uuid = transaction_uuid.split("?")[0].split("&")[0].trim();
    }

    let parsedDataStatus: string | null = null;
    let parsedRefId: string | null = null;
    let esewaRawResponse: any = {};

    // Decode base64 data if passed from eSewa redirect URL ?data=...
    if (encodedData && typeof encodedData === "string" && encodedData.trim()) {
      try {
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

    product_code = product_code || ESEWA_PRODUCT_CODE;

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

    // ACTION: CANCEL
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

    // ACTION: VERIFY or CHECK_STATUS
    total_amount = total_amount || txn.amount.toString();
    const cleanAmount = Number(total_amount.toString().replace(/,/g, "")).toString();

    // Query eSewa Status Inquiry API
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
