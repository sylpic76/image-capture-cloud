
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

// Environment variables are automatically available in edge functions
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

serve(async (req: Request) => {
  // CORS headers for preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      }
    });
  }

  try {
    // Get the latest screenshot
    const { data, error } = await supabase
      .from('screenshot_log')
      .select('image_url')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error("Database error:", error);
      return new Response(JSON.stringify({ error: "Database error" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!data || data.length === 0 || !data[0].image_url) {
      return new Response(JSON.stringify({ error: "No screenshot found" }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Redirect to the image URL
    return new Response(null, {
      status: 302,
      headers: {
        "Location": data[0].image_url,
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    console.error("Server error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
