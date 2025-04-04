
import { createClient } from "@supabase/supabase-js";
import { createLogger } from '../logger';

const { logDebug, logError } = createLogger();

// Créer un client Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Upload a screenshot to Supabase storage
 */
export async function uploadScreenshot(blob: Blob, captureId?: number): Promise<string | null> {
  try {
    // Générer un nom de fichier unique basé sur la date
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '').substring(0, 15);
    const fileName = `screen_${timestamp}.png`;
    
    logDebug(`[uploadScreenshot] 📤 Uploading ${fileName}, size: ${blob.size} bytes`);

    // Télécharger le fichier vers le bucket "screenshots"
    const { data, error } = await supabase.storage
      .from("screenshots")
      .upload(fileName, blob, {
        contentType: "image/png",
        upsert: false,
      });

    if (error) {
      logError("[uploadScreenshot] ❌ Upload failed", error);
      return null;
    }

    logDebug(`[uploadScreenshot] File uploaded successfully: ${fileName}`);

    // Créer une URL signée pour l'accès au fichier
    const { data: signed, error: signedError } = await supabase.storage
      .from("screenshots")
      .createSignedUrl(fileName, 3600); // valide 1h

    if (signedError || !signed?.signedUrl) {
      logError("[uploadScreenshot] ❌ Could not get signed URL", signedError);
      return null;
    }

    logDebug(`[uploadScreenshot] ✅ Signed URL created: ${signed.signedUrl.substring(0, 50)}...`);
    return signed.signedUrl;
  } catch (err) {
    logError("[uploadScreenshot] Unexpected error during upload", err);
    return null;
  }
}
