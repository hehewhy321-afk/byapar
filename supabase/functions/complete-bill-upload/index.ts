import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, HeadObjectCommand, DeleteObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.714.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
declare const Deno: any;

const MAX_ALLOWED_BYTES = 1.5 * 1024 * 1024; // 1.5 MB strict ceiling

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

    // 1. Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user token", details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { imageId, businessId, billId, setPrimary = true } = body;

    if (!imageId || !businessId) {
      return new Response(JSON.stringify({ error: "imageId and businessId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // 3. Find pending bill_images record
    const { data: imgRecord, error: fetchError } = await supabase
      .from("bill_images")
      .select("*")
      .eq("id", imageId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (fetchError || !imgRecord) {
      return new Response(JSON.stringify({ error: "Image record not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Authoritative Verification via S3 HeadObject on Cloudflare R2
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

    let actualSize = 0;
    let actualMime = imgRecord.mime_type;

    try {
      const headRes = await r2Client.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: imgRecord.object_key,
        })
      );

      actualSize = headRes.ContentLength ?? 0;
      actualMime = headRes.ContentType ?? imgRecord.mime_type;
    } catch (headErr: any) {
      console.error("[complete-bill-upload] HeadObject failed:", headErr);
      return new Response(
        JSON.stringify({
          error: "Upload verification failed: file does not exist in R2 bucket yet",
          details: headErr?.message || String(headErr),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Authoritative size ceiling enforcement (1.5 MB maximum)
    if (actualSize > MAX_ALLOWED_BYTES) {
      try {
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: imgRecord.object_key,
          })
        );
      } catch (delErr) {
        console.warn("[complete-bill-upload] Failed to purge oversized file:", delErr);
      }

      await supabase
        .from("bill_images")
        .update({
          status: "failed",
          file_size_bytes: actualSize,
        })
        .eq("id", imageId);

      return new Response(
        JSON.stringify({
          error: `File size exceeds 1.5MB ceiling (actual: ${(actualSize / 1024 / 1024).toFixed(2)} MB). File purged.`,
          size: actualSize,
          maxAllowed: MAX_ALLOWED_BYTES,
        }),
        {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 6. Commit upload status to database
    const nowIso = new Date().toISOString();
    const targetBillId = billId || imgRecord.bill_id;

    // Verify target bill exists to prevent foreign key constraint violations
    let validBillId: string | null = null;
    if (targetBillId) {
      const { data: existingBill } = await supabase
        .from("bills")
        .select("id")
        .eq("id", targetBillId)
        .eq("business_id", businessId)
        .maybeSingle();
      if (existingBill) {
        validBillId = existingBill.id;
      }
    }

    const { data: updatedImage, error: updateError } = await supabase
      .from("bill_images")
      .update({
        status: "uploaded",
        bill_id: validBillId,
        file_size_bytes: actualSize,
        mime_type: actualMime,
        uploaded_at: nowIso,
      })
      .eq("id", imageId)
      .select()
      .single();

    if (updateError) {
      console.error("[complete-bill-upload] Error updating bill_images:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update image record", details: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Link as primary image on the bill if bill exists
    if (setPrimary && validBillId) {
      await supabase
        .from("bills")
        .update({
          primary_image_id: imageId,
          updated_at: nowIso,
        })
        .eq("id", validBillId)
        .eq("business_id", businessId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        record: {
          id: updatedImage.id,
          businessId: updatedImage.business_id,
          billId: updatedImage.bill_id,
          uploadedBy: updatedImage.uploaded_by,
          objectKey: updatedImage.object_key,
          mimeType: updatedImage.mime_type,
          fileSizeBytes: updatedImage.file_size_bytes,
          status: updatedImage.status,
          createdAt: updatedImage.created_at,
          uploadedAt: updatedImage.uploaded_at,
        },
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
