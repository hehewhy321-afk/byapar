import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.714.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.714.0";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // 1. Verify authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user token", details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { billId, businessId, fileName, mimeType = "image/webp", width, height } = body;

    if (!businessId) {
      return new Response(JSON.stringify({ error: "businessId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (businessId === "a0000000-0000-0000-0000-000000000001") {
      return new Response(
        JSON.stringify({
          error: "Demo store mode cannot upload to cloud storage. Please sign in to a registered business store.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Authorize business membership or store ownership
    let isAuthorized = false;
    const { data: membership } = await supabase
      .from("business_members")
      .select("role, is_active")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membership) {
      isAuthorized = true;
    } else {
      // Check if business exists in businesses table
      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", businessId)
        .maybeSingle();
      if (biz) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized: not an active member of this business" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Verify bill if billId is provided and exists
    let validBillId: string | null = null;
    if (billId) {
      const { data: existingBill } = await supabase
        .from("bills")
        .select("id")
        .eq("id", billId)
        .eq("business_id", businessId)
        .maybeSingle();
      if (existingBill) {
        validBillId = existingBill.id;
      }
    }

    // 4. Check daily upload limit from active subscription plan
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("plan_tier, status")
      .eq("business_id", businessId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const planTier = subData?.plan_tier || "free";
    const { data: planConfig } = await supabase
      .from("subscription_plans")
      .select("daily_bill_upload_limit")
      .eq("id", planTier)
      .maybeSingle();

    const dailyLimit = planConfig?.daily_bill_upload_limit ?? 3; // Default 3 for free tier
    if (dailyLimit !== -1) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("bills")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("created_at", startOfDay.toISOString());

      if ((count ?? 0) >= dailyLimit) {
        return new Response(
          JSON.stringify({
            error: "Daily upload limit reached",
            limit: dailyLimit,
            current: count,
            message: `Daily bill upload limit reached (${count}/${dailyLimit}). Upgrade plan for higher limits.`
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 5. Generate server-controlled image ID and object key (bills/businessId/billId/imageId.ext)
    const imageId = crypto.randomUUID();
    const cleanExt = mimeType === "image/jpeg" || mimeType === "image/jpg" ? "jpg" : "webp";
    const folderId = billId || imageId;
    const objectKey = `bills/${businessId}/${folderId}/${imageId}.${cleanExt}`;

    // 6. Insert pending record into database
    const { error: insertError } = await supabase
      .from("bill_images")
      .insert({
        id: imageId,
        business_id: businessId,
        bill_id: validBillId,
        uploaded_by: user.id,
        object_key: objectKey,
        mime_type: mimeType,
        width: width || null,
        height: height || null,
        status: "pending",
      });

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to create image record", details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Generate Cloudflare R2 Presigned PUT URL
    const accountId = Deno.env.get("R2_ACCOUNT_ID") ?? "";
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") ?? "";
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "";
    const bucketName = Deno.env.get("R2_BUCKET_NAME") ?? "byapar-bills-prod";
    const endpoint = Deno.env.get("R2_ENDPOINT") || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      return new Response(JSON.stringify({
        error: "Cloudflare R2 storage credentials (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) are not configured in Supabase project secrets.",
        configured: false,
        imageId,
        objectKey
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r2Client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const expiresInSeconds = 600; // 10 minutes
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(r2Client, putCommand, { expiresIn: expiresInSeconds });

    return new Response(
      JSON.stringify({
        success: true,
        uploadUrl,
        imageId,
        objectKey,
        expiresIn: expiresInSeconds,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Internal server error", details: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
