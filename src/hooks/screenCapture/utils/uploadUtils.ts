
import { createClient } from "@supabase/supabase-js";
import { createLogger } from '../logger';

const { logDebug, logError } = createLogger();

// Create a Supabase client
const createSupabaseClient = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    logError("[uploadUtils] Missing Supabase URL or API key");
    throw new Error("Supabase configuration missing");
  }
  
  return createClient(url, key);
};

/**
 * Upload a screenshot to Supabase storage
 */
export async function uploadScreenshot(blob: Blob, captureId?: number): Promise<string | null> {
  try {
    // Generate a unique filename based on date
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '').substring(0, 15);
    const fileName = `screen_${timestamp}.png`;
    
    logDebug(`[uploadUtils] 📤 Uploading ${fileName}, size: ${blob.size} bytes`);

    const supabase = createSupabaseClient();

    // Upload the file to the "screenshots" bucket
    const { data, error } = await supabase.storage
      .from("screenshots")
      .upload(fileName, blob, {
        contentType: "image/png",
        upsert: false,
      });

    if (error) {
      logError(`[uploadUtils] ❌ Upload failed: ${error.message}`);
      return null;
    }

    logDebug(`[uploadUtils] File uploaded successfully: ${fileName}`);

    // Create a signed URL for file access
    const { data: signed, error: signedError } = await supabase.storage
      .from("screenshots")
      .createSignedUrl(fileName, 3600); // valid for 1 hour

    if (signedError || !signed?.signedUrl) {
      logError(`[uploadUtils] ❌ Could not get signed URL: ${signedError?.message || 'Unknown error'}`);
      return null;
    }

    logDebug(`[uploadUtils] ✅ Signed URL created: ${signed.signedUrl.substring(0, 50)}...`);
    
    // Insert record in database
    try {
      const { error: insertError } = await supabase
        .from("screenshot_log")
        .insert({ image_url: signed.signedUrl });
        
      if (insertError) {
        logError(`[uploadUtils] ⚠️ Failed to record in database, but upload succeeded: ${insertError.message}`);
      } else {
        logDebug(`[uploadUtils] ✅ Screenshot logged to database`);
      }
    } catch (dbError) {
      logError(`[uploadUtils] ⚠️ Database operation failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }
    
    return signed.signedUrl;
  } catch (err) {
    logError(`[uploadUtils] Unexpected error during upload: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return null;
  }
}
