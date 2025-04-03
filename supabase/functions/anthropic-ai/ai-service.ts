
import { GEMINI_API_KEY, GEMINI_API_URL } from "./config.ts";

export async function processRequest(systemPrompt: string, userMessage: string, screenshot: string | null) {
  console.log("Sending request to Gemini API...");
  console.log(`API URL: ${GEMINI_API_URL}`);
  
  // Get API key from environment variables
  const apiKey = Deno.env.get("GEMINI_API_KEY") || GEMINI_API_KEY;
  console.log("✅ GEMINI_API_KEY loaded:", !!apiKey);
  
  if (!apiKey || apiKey === "your-gemini-key-will-be-set-via-env") {
    console.error("GEMINI_API_KEY is not configured in environment variables");
    throw new Error("GEMINI_API_KEY is not configured. Please set it in the Supabase dashboard or environment variables.");
  }
  
  // Build the request payload for Gemini API
  const requestPayload: any = {
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
      maxOutputTokens: 4096
    },
    systemInstruction: {
      parts: [
        { text: "You are an expert AI assistant specialized in helping developers with web applications." }
      ]
    }
  };
  
  // Add the image if provided
  if (screenshot && screenshot.length > 0) {
    try {
      // Gemini requires base64 images without the prefix
      const base64Image = screenshot.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
      
      // Add image to the parts array
      requestPayload.contents[0].parts.push({
        inlineData: {
          mimeType: screenshot.startsWith('data:image/png') ? "image/png" : "image/jpeg",
          data: base64Image
        }
      });
      
      console.log("Added image to the request");
    } catch (imgError) {
      console.error("Error processing image:", imgError);
      // Continue without the image if there's an error
    }
  }
  
  console.log(`API request payload preview:`, JSON.stringify(requestPayload).substring(0, 200) + "...");
  
  try {
    // Format API URL with API key for Gemini
    const urlWithApiKey = `${GEMINI_API_URL}?key=${apiKey}`;
    
    const response = await fetch(urlWithApiKey, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errorText);
      throw new Error(`Gemini API responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Gemini API response received successfully");

    // Extract and return the assistant's response
    const assistantResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Problème avec la réponse de l'API Gemini.";
    return assistantResponse;
  } catch (error) {
    console.error("Error calling Gemini API:", error.message);
    throw error;
  }
}
