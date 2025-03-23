
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

// Define constants directly instead of using Deno.env.get which is not supported in V1
const SUPABASE_URL = "https://mvuccsplodgeomzqnwjs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dWNjc3Bsb2RnZW9tenFud2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NDA0OTAsImV4cCI6MjA1ODMxNjQ5MH0.iI5zthLtXrXLbjklBCx9pkC09e2sWEjXV97cXDz7uYA";

// Create Supabase client with the anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// CORS headers - allowing access from any origin
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Starting cleanup of old screenshots");

    // 1. Get all screenshots, ordered by created_at desc
    const { data: screenshots, error: fetchError } = await supabase
      .from("screenshot_log")
      .select("id, image_url, created_at")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching screenshots:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch screenshots", details: fetchError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log(`Found ${screenshots?.length || 0} screenshots`);

    // 2. If we have more than 3 screenshots, delete the extras
    if (screenshots && screenshots.length > 3) {
      const screenshotsToDelete = screenshots.slice(3);
      const idsToDelete = screenshotsToDelete.map(screenshot => screenshot.id);
      
      console.log(`Deleting ${idsToDelete.length} old screenshots`);

      // Delete from the database
      const { error: deleteError } = await supabase
        .from("screenshot_log")
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        console.error("Error deleting old screenshots:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to delete old screenshots", details: deleteError }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      // Also delete the files from storage
      // For each screenshot to delete, extract the filename from the URL
      for (const screenshot of screenshotsToDelete) {
        try {
          const url = new URL(screenshot.image_url);
          const pathname = url.pathname;
          const parts = pathname.split('/');
          const filename = parts[parts.length - 1];
          
          console.log(`Attempting to delete file from storage: ${filename}`);
          
          const { error: storageError } = await supabase
            .storage
            .from("screenshots")
            .remove([filename]);
          
          if (storageError) {
            console.error(`Failed to delete file ${filename} from storage:`, storageError);
          }
        } catch (e) {
          console.error(`Error processing URL ${screenshot.image_url}:`, e);
        }
      }
    } else {
      console.log("No screenshots to delete, keeping all existing screenshots");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Cleanup completed successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "Server error", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
