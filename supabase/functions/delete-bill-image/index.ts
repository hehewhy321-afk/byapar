import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.714.0";

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

    // 1. Authorize user membership
    const { data: membership, error: memError } = await supabase
      .from("business_members")
      .select("role, is_active")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (memError || !membership) {
      return new Response(JSON.stringify({ error: "Unauthorized access to business images" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch image record
    const { data: imgRecord, error: imgError } = await supabase
      .from("bill_images")
      .select("id, bill_id, object_key")
      .eq("id", imageId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (imgError || !imgRecord) {
      return new Response(JSON.stringify({ error: "Image not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Delete from Cloudflare R2
    const accountId = Deno.env.get("R2_ACCOUNT_ID") ?? "";
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") ?? "";
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "";
    const bucketName = Deno.env.get("R2_BUCKET_NAME") ?? "byapar-bills-prod";
    const endpoint = Deno.env.get("R2_ENDPOINT") || `https://${accountId}.r2.cloudflarestorage.com`;

    if (accessKeyId && secretAccessKey) {
      try {
        const r2Client = new S3Client({
          region: "auto",
          endpoint,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });

        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: imgRecord.object_key,
          })
        );
      } catch (r2Err) {
        console.warn("R2 delete object error:", r2Err);
      }
    }

    // 4. Soft-delete database record
    const nowIso = new Date().toISOString();
    await supabase
      .from("bill_images")
      .update({
        status: "deleted",
        deleted_at: nowIso,
      })
      .eq("id", imageId);

    // 5. Unlink from bill if primary
    if (imgRecord.bill_id) {
      await supabase
        .from("bills")
        .update({
          primary_image_id: null,
          updated_at: nowIso,
        })
        .eq("id", imgRecord.bill_id)
        .eq("primary_image_id", imageId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedId: imageId,
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
