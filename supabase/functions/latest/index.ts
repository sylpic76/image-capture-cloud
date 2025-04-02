
// Import the necessary modules for Deno
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define constants directly instead of using Deno.env.get which is not supported in V1
const SUPABASE_URL = "https://mvuccsplodgeomzqnwjs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dWNjc3Bsb2RnZW9tenFud2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NDA0OTAsImV4cCI6MjA1ODMxNjQ5MH0.iI5zthLtXrXLbjklBCx9pkC09e2sWEjXV97cXDz7uYA";

const API_ENDPOINT = `${SUPABASE_URL}/rest/v1/screenshot_log?select=image_url&order=created_at.desc&limit=1`;

// CORS headers - allowing access from ANY origin with strong no-cache directives
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const requestId = crypto.randomUUID().substring(0, 8);
    console.log(`[${requestId}] Starting latest screenshot request`);
    
    // Parse URL to get query parameters
    const url = new URL(req.url);
    const cacheBuster = url.searchParams.get('t') || Date.now().toString();
    console.log(`[${requestId}] Request with cache buster: ${cacheBuster}`);
    
    // Log request headers for debugging
    console.log(`[${requestId}] Request headers:`, 
      Object.fromEntries(
        Array.from(req.headers.entries())
          .filter(([key]) => !['authorization', 'apikey'].includes(key.toLowerCase()))
      )
    );
    
    // Fetch the latest screenshot metadata with proper authentication and no-cache headers
    console.log(`[${requestId}] Fetching from database API: ${API_ENDPOINT}`);
    const response = await fetch(API_ENDPOINT, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store",
        "Pragma": "no-cache",
      }
    });

    console.log(`[${requestId}] Database query response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] Database query failed: ${response.status} ${response.statusText}`, errorText);
      return new Response(JSON.stringify({ 
        error: "Database query failed", 
        status: response.status,
        requestId 
      }), { 
        status: response.status, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      });
    }

    const data = await response.json();
    console.log(`[${requestId}] Data received:`, JSON.stringify(data));
    
    const imageUrl = data?.[0]?.image_url;

    if (!imageUrl) {
      console.log(`[${requestId}] No screenshot found in database`);
      return new Response(JSON.stringify({
        error: "No screenshot found",
        requestId
      }), { 
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    console.log(`[${requestId}] Found image URL: ${imageUrl}, fetching image...`);
    
    // Add cache buster to image URL
    const imageUrlWithCacheBuster = `${imageUrl}?t=${cacheBuster}`;
    
    // Fetch the actual image with aggressive cache prevention
    console.log(`[${requestId}] Fetching image from: ${imageUrlWithCacheBuster}`);
    const imageRes = await fetch(imageUrlWithCacheBuster, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Cache-Control": "no-cache, no-store",
        "Pragma": "no-cache",
      }
    });
    
    if (!imageRes.ok) {
      const errorText = await imageRes.text();
      console.error(`[${requestId}] Failed to fetch image: ${imageRes.status} ${imageRes.statusText}`, errorText);
      return new Response(JSON.stringify({
        error: `Failed to fetch image: ${imageRes.statusText}`,
        status: imageRes.status,
        requestId
      }), {
        status: imageRes.status,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    // Get image data and content type
    const buffer = await imageRes.arrayBuffer();
    const contentType = imageRes.headers.get("Content-Type") || "image/png";
    
    console.log(`[${requestId}] Successfully fetched image, content type: ${contentType}, size: ${buffer.byteLength} bytes`);

    // Return the image with proper headers - no caching allowed
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate", 
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Request-ID": requestId,
        ...corsHeaders
      }
    });
  } catch (err) {
    const errorId = crypto.randomUUID().substring(0, 8);
    console.error(`[${errorId}] Server error:`, err);
    return new Response(JSON.stringify({ 
      error: "Server error", 
      details: String(err),
      errorId 
    }), { 
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
