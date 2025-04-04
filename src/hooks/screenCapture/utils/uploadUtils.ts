
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function uploadScreenshot(blob: Blob, captureId?: number): Promise<string> {
  const endpoint = `https://mvuccsplodgeomzqnwjs.supabase.co/functions/v1/capture-screenshot?t=${Date.now()}`;
  const captureIdStr = captureId ? `#${captureId}` : '';
  console.log(`[uploadScreenshot] 📤 Uploading capture ${captureIdStr} to ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": blob.type,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: blob,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[uploadScreenshot] ❌ HTTP ${response.status}: ${errorText}`);
      throw new Error(`Upload failed: ${response.status}`);
    }

    const json = await response.json();
    if (!json.url) {
      throw new Error(`Réponse invalide : ${JSON.stringify(json)}`);
    }

    console.log(`[uploadScreenshot] ✅ Upload réussi : ${json.url}`);
    return json.url;
  } catch (err) {
    console.error(`[uploadScreenshot] ❌ Erreur réseau :`, err);
    throw err;
  }
}
