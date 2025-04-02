
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.0";

// Set up CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the most recent screenshot from the bucket
    const { data: files, error } = await supabase
      .storage
      .from("screenshots")
      .list("", { limit: 1, sortBy: { column: "created_at", order: "desc" } });

    if (error || !files?.[0]) {
      console.error("No files found or error:", error);
      return new Response(JSON.stringify({ error: "No screenshot found" }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const file = files[0];
    console.log(`Latest file found: ${file.name}, created at: ${file.created_at}`);

    // Create a signed URL for the latest file
    const { data: signed, error: signedError } = await supabase
      .storage
      .from("screenshots")
      .createSignedUrl(file.name, 3600); // Valid for 1 hour

    if (signedError || !signed?.signedUrl) {
      console.error("Could not sign URL:", signedError);
      return new Response(JSON.stringify({ error: "Could not sign file" }), {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log(`Signed URL created: ${signed.signedUrl.substring(0, 50)}...`);

    // Return the signed URL
    return new Response(JSON.stringify({ url: signed.signedUrl }), {
      headers: corsHeaders,
      status: 200,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Server error", details: err.message }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});
