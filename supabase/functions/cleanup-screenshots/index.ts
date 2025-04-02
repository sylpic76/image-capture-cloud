
// Import the necessary modules for Deno
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

// Define constants - hardcoding for compatibility with Supabase Functions V1
const SUPABASE_URL = "https://mvuccsplodgeomzqnwjs.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Create Supabase client with the service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting cleanup of old screenshots");
    
    // Get all screenshot records ordered by creation time
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
    
    console.log(`Found ${screenshots.length} screenshots in database`);
    
    // Keep only the 3 most recent screenshots
    const screenshotsToKeep = screenshots.slice(0, 3);
    const screenshotsToDelete = screenshots.slice(3);
    
    console.log(`Keeping ${screenshotsToKeep.length} recent screenshots, deleting ${screenshotsToDelete.length} old ones`);
    
    if (screenshotsToDelete.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No screenshots to delete" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    // Extract IDs of screenshots to delete
    const idsToDelete = screenshotsToDelete.map(s => s.id);
    
    // Delete old records from the database
    const { error: deleteError } = await supabase
      .from("screenshot_log")
      .delete()
      .in("id", idsToDelete);
    
    if (deleteError) {
      console.error("Error deleting old screenshots from database:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete old screenshots", details: deleteError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Delete old files from storage
    // Extract filenames from URLs, e.g., https://...screenshots/screen_20250324_001223.png
    const deleteStoragePromises = screenshotsToDelete.map(async (screenshot) => {
      try {
        const url = new URL(screenshot.image_url);
        const pathParts = url.pathname.split("/");
        const filename = pathParts[pathParts.length - 1];
        
        if (filename) {
          console.log(`Deleting storage file: ${filename}`);
          const { error } = await supabase.storage.from("screenshots").remove([filename]);
          if (error) {
            console.error(`Error deleting file ${filename} from storage:`, error);
          }
        }
      } catch (error) {
        console.error("Error parsing URL or deleting file:", error);
      }
    });
    
    // Wait for all storage deletions to complete
    await Promise.all(deleteStoragePromises);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${screenshotsToDelete.length} old screenshots`,
        kept: screenshotsToKeep.length,
        deleted: screenshotsToDelete.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "Server error", details: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
