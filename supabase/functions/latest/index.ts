
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Use environment variables properly
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const API_ENDPOINT = `${SUPABASE_URL}/rest/v1/screenshot_log?select=image_url&order=created_at.desc&limit=1`;

// CORS headers - allowing access from any origin
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Fetch the latest screenshot metadata with proper authentication
    const response = await fetch(API_ENDPOINT, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      console.error(`Database query failed: ${response.status} ${response.statusText}`);
      return new Response(JSON.stringify({ error: "Database query failed", status: response.status }), { 
        status: response.status, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      });
    }

    const data = await response.json();
    const imageUrl = data?.[0]?.image_url;

    if (!imageUrl) {
      return new Response("No screenshot found", { 
        status: 404,
        headers: {
          "Content-Type": "text/plain",
          ...corsHeaders
        }
      });
    }

    // Fetch the actual image
    const imageRes = await fetch(imageUrl);
    
    if (!imageRes.ok) {
      return new Response(`Failed to fetch image: ${imageRes.statusText}`, {
        status: imageRes.status,
        headers: {
          "Content-Type": "text/plain",
          ...corsHeaders
        }
      });
    }

    // Get image data and content type
    const buffer = await imageRes.arrayBuffer();
    const contentType = imageRes.headers.get("Content-Type") || "image/png";

    // Return the image with proper headers
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60", // Cache for 60 seconds
        ...corsHeaders
      }
    });
  } catch (err) {
    console.error("Server error:", err);
    return new Response(JSON.stringify({ error: "Server error", details: String(err) }), { 
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
