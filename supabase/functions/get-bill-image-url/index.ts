import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.714.0";
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

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { imageId, businessId } = body;

    if (!imageId || !businessId) {
      return new Response(JSON.stringify({ error: "imageId and businessId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Authorize user membership or store ownership
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
      return new Response(JSON.stringify({ error: "Unauthorized access to business images" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch image metadata
    const { data: imgRecord, error: imgError } = await supabase
      .from("bill_images")
      .select("id, object_key, mime_type, status, deleted_at")
      .eq("id", imageId)
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .maybeSingle();

    if (imgError || !imgRecord) {
      return new Response(JSON.stringify({ error: "Image not found or has been deleted" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Connect to Cloudflare R2 and generate S3 Presigned GET URL
    const accountId = Deno.env.get("R2_ACCOUNT_ID") ?? "";
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") ?? "";
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "";
    const bucketName = Deno.env.get("R2_BUCKET_NAME") ?? "byapar-bills-prod";
    const endpoint = Deno.env.get("R2_ENDPOINT") || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      return new Response(JSON.stringify({ error: "Cloudflare R2 storage credentials are not configured in Supabase project secrets" }), {
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

    const expiresInSeconds = 900; // 15 minutes TTL

    // Presigned GET with private client disk cache header
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: imgRecord.object_key,
      ResponseCacheControl: "private, max-age=86400",
    });

    const signedUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: expiresInSeconds });

    return new Response(
      JSON.stringify({
        success: true,
        signedUrl,
        expiresIn: expiresInSeconds,
        mimeType: imgRecord.mime_type,
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
