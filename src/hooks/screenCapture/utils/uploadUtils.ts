import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function uploadScreenshot(blob: Blob, captureId?: number): Promise<string> {
  const fileName = `screen_${new Date().toISOString()}.png`;
  console.log(`[uploadScreenshot] 📤 Uploading ${fileName}`);

  const { data, error } = await supabase.storage
    .from("screenshots")
    .upload(fileName, blob, {
      contentType: "image/png",
      upsert: false,
    });

  if (error) {
    console.error("[uploadScreenshot] ❌ Upload failed", error);
    return null;
  }

  const { data: signed } = await supabase.storage
    .from("screenshots")
    .createSignedUrl(fileName, 3600); // valid 1h

  if (!signed?.signedUrl) {
    console.error("[uploadScreenshot] ❌ Could not get signed URL");
    return null;
  }

  console.log(`[uploadScreenshot] ✅ Uploaded & signed: ${signed.signedUrl}`);
  return signed.signedUrl;
}
