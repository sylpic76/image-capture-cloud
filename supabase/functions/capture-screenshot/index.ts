import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

// Environment variables are automatically available in edge functions
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Create Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers with strong cache control
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

serve(async (req: Request) => {
  // Handle preflight requests for CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Starting screenshot capture process");

    // Parse the form data containing the screenshot
    const data = await req.formData();
    const file = data.get("screenshot") as File;
    
    if (!file) {
      console.error("No screenshot file provided in request");
      return new Response(
        JSON.stringify({ error: "No screenshot provided" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // Generate a unique filename with timestamp format (YYYYMMDD_HHmmss)
    const now = new Date();
    const dateStr = now.toISOString()
      .replace(/[-:T.Z]/g, "")  // Remove special characters
      .slice(0, 14);            // Get YYYYMMDDHHMMSS
    
    // Format as screen_YYYYMMDD_HHmmss.png
    const formattedDate = `${dateStr.slice(0,8)}_${dateStr.slice(8,14)}`;
    const filename = `screen_${formattedDate}.png`;
    
    console.log(`Processing screenshot: ${filename}`);
    
    // Upload to Supabase Storage with no-cache headers
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("screenshots")
      .upload(filename, file, {
        contentType: "image/png",
        cacheControl: "max-age=0, no-cache",
        upsert: true
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload screenshot", details: uploadError }),
        { headers: corsHeaders, status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase
      .storage
      .from("screenshots")
      .getPublicUrl(filename);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`Screenshot uploaded successfully: ${publicUrl}`);

    // Add entry to screenshot_log table
    const { data: logData, error: logError } = await supabase
      .from("screenshot_log")
      .insert([{ image_url: publicUrl }]);

    if (logError) {
      console.error("Log error:", logError);
      return new Response(
        JSON.stringify({ error: "Failed to log screenshot", details: logError }),
        { headers: corsHeaders, status: 500 }
      );
    }

    // Remove old screenshots, keeping only the 3 most recent
    try {
      // Get all screenshots ordered by created_at
      const { data: screenshots, error: fetchError } = await supabase
        .from("screenshot_log")
        .select("id, image_url")
        .order("created_at", { ascending: false });
      
      if (fetchError) {
        throw fetchError;
      }
      
      // If we have more than 3 screenshots, delete the older ones
      if (screenshots && screenshots.length > 3) {
        console.log(`Found ${screenshots.length} screenshots, keeping only the 3 most recent`);
        
        // Get IDs to delete (everything after the first 3)
        const toDelete = screenshots.slice(3).map(s => s.id);
        
        // Delete from the database
        const { error: deleteError } = await supabase
          .from("screenshot_log")
          .delete()
          .in('id', toDelete);
          
        if (deleteError) {
          console.error("Error deleting old screenshot records:", deleteError);
        }
        
        // Extract file paths from URLs to delete from storage
        const storageFiles = screenshots.slice(3)
          .map(s => {
            const url = s.image_url;
            const parts = url.split('/');
            return parts[parts.length - 1];
          });
          
        // Delete files from storage
        if (storageFiles.length > 0) {
          const { error: storageDeleteError } = await supabase
            .storage
            .from("screenshots")
            .remove(storageFiles);
            
          if (storageDeleteError) {
            console.error("Error deleting old files from storage:", storageDeleteError);
          } else {
            console.log(`Successfully deleted ${storageFiles.length} old screenshots`);
          }
        }
      }
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
      // We don't want to fail the whole request if cleanup fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrl,
        message: "Screenshot captured and stored successfully" 
      }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "Server error", details: error.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
