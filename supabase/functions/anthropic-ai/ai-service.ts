
import { GEMINI_API_KEY, GEMINI_API_URL } from "./config.ts";

export async function processGeminiRequest(systemPrompt: string, userMessage: string, screenshot: string | null) {
  console.log("Sending request to Gemini API...");
  console.log(`API URL: ${GEMINI_API_URL}`);
  
  // Format de requête pour l'API Gemini v1beta avec support d'image
  const geminiRequestPayload = {
    model: "gemini-1.5-pro",
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt + "\n\n" + userMessage }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000,
    }
  };
  
  // Ajouter l'image si elle est fournie
  if (screenshot && screenshot.length > 0) {
    // Modifier la requête pour inclure l'image
    geminiRequestPayload.contents[0].parts.push({
      inlineData: {
        data: screenshot.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''), // Enlever le préfixe data:image si présent
        mimeType: screenshot.startsWith('data:image/png') ? "image/png" : "image/jpeg"
      }
    });
  }
  
  console.log(`API request payload preview:`, JSON.stringify(geminiRequestPayload).substring(0, 200) + "...");
  
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(geminiRequestPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API error (${response.status}):`, errorText);
    throw new Error(`Gemini API responded with ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log("Gemini API response received successfully");

  // Extract and return the assistant's response - Format corrigé pour la version v1beta
  const assistantResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Problème avec la réponse de l'API.";
  return assistantResponse;
}
