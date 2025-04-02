
// Import the necessary modules for Deno
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.0";

// Define constants directly instead of using Deno.env.get which might not be available
const SUPABASE_URL = "https://mvuccsplodgeomzqnwjs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dWNjc3Bsb2RnZW9tenFud2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NDA0OTAsImV4cCI6MjA1ODMxNjQ5MH0.iI5zthLtXrXLbjklBCx9pkC09e2sWEjXV97cXDz7uYA";

// Enhanced CORS headers to allow browser requests from any origin
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma, x-requested-with",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache"
};

serve(async (req) => {
  // Generate a unique ID for this request for better logging
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[${requestId}] Starting last-capture request`);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log(`[${requestId}] Handling OPTIONS preflight request`);
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Create Supabase client with anon key
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Add cache buster to avoid caching issues
    const cacheBuster = new Date().getTime();
    console.log(`[${requestId}] Fetching latest screenshot with cacheBuster ${cacheBuster}`);
    
    // Get the most recent screenshot from the bucket
    const { data: files, error } = await supabase
      .storage
      .from("screenshots")
      .list("", { 
        limit: 1, 
        sortBy: { column: "created_at", order: "desc" },
        offset: 0
      });

    if (error || !files || files.length === 0) {
      console.error(`[${requestId}] Error fetching screenshot list:`, error);
      return new Response(JSON.stringify({ 
        error: "No screenshots found", 
        details: error?.message,
        requestId 
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const file = files[0];
    console.log(`[${requestId}] Latest file found: ${file.name}, created at: ${file.created_at}`);

    // Create a signed URL for the latest file
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from("screenshots")
      .createSignedUrl(file.name, 3600); // Valid for 1 hour

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error(`[${requestId}] Error creating signed URL:`, signedUrlError);
      return new Response(JSON.stringify({ 
        error: "Could not create signed URL", 
        details: signedUrlError?.message,
        requestId
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Add cache buster to signed URL
    const signedUrl = new URL(signedUrlData.signedUrl);
    signedUrl.searchParams.append('t', cacheBuster.toString());
    
    console.log(`[${requestId}] Created signed URL successfully`);

    // Return the signed URL with cache control headers
    return new Response(JSON.stringify({ 
      url: signedUrl.toString(),
      filename: file.name,
      created_at: file.created_at,
      requestId
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err) {
    console.error(`[${requestId}] Unexpected error:`, err);
    return new Response(JSON.stringify({ 
      error: "Server error", 
      details: err.message,
      requestId
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
