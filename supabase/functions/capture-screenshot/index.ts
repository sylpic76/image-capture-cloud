
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

// Environment variables are automatically available in edge functions
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Create Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    // This function would be better with a Python backend, but for the demo,
    // we'll accept an uploaded screenshot that was taken using a browser API
    const data = await req.formData();
    const file = data.get("screenshot") as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: "No screenshot provided" }),
        { headers, status: 400 }
      );
    }

    // Generate a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "");
    const filename = `screen_${timestamp}.png`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("screenshots")
      .upload(filename, file, {
        contentType: "image/png",
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload screenshot", details: uploadError }),
        { headers, status: 500 }
      );
    }

    // Get the public URL
    const { data: publicUrlData } = supabase
      .storage
      .from("screenshots")
      .getPublicUrl(filename);

    const publicUrl = publicUrlData.publicUrl;

    // Add entry to screenshot_log table
    const { data: logData, error: logError } = await supabase
      .from("screenshot_log")
      .insert([{ image_url: publicUrl }]);

    if (logError) {
      console.error("Log error:", logError);
      return new Response(
        JSON.stringify({ error: "Failed to log screenshot", details: logError }),
        { headers, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrl,
        message: "Screenshot captured and stored successfully" 
      }),
      { headers, status: 200 }
    );
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "Server error", details: error.message }),
      { headers, status: 500 }
    );
  }
});
