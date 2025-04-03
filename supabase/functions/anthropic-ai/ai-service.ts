
import { ANTHROPIC_API_KEY, ANTHROPIC_API_URL } from "./config.ts";

export async function processAnthropicRequest(systemPrompt: string, userMessage: string, screenshot: string | null) {
  console.log("Sending request to Anthropic API...");
  console.log(`API URL: ${ANTHROPIC_API_URL}`);
  
  // Obtenir l'API key depuis les variables d'environnement
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-anthropic-key-will-be-set-via-env") {
    console.error("ANTHROPIC_API_KEY is not configured in environment variables");
    throw new Error("ANTHROPIC_API_KEY is not configured. Please set it in the Supabase dashboard or environment variables.");
  }
  
  // Build the messages array for Claude API
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: systemPrompt + "\n\n" + userMessage }
      ]
    }
  ];
  
  // Add the image if provided
  if (screenshot && screenshot.length > 0) {
    try {
      // Claude requires base64 images without the prefix
      const base64Image = screenshot.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
      
      // Add the image to the first user message's content
      messages[0].content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: screenshot.startsWith('data:image/png') ? "image/png" : "image/jpeg",
          data: base64Image
        }
      });
      
      console.log("Added image to the request");
    } catch (imgError) {
      console.error("Error processing image:", imgError);
      // Continue without the image if there's an error
    }
  }
  
  // Build the complete request payload
  const requestPayload = {
    model: "claude-3-opus-20240229",
    messages: messages,
    max_tokens: 4096,
    temperature: 0.7,
    system: "You are an expert AI assistant specialized in helping developers with web applications."
  };
  
  console.log(`API request payload preview:`, JSON.stringify(requestPayload).substring(0, 200) + "...");
  
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Anthropic API error (${response.status}):`, errorText);
      throw new Error(`Anthropic API responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Anthropic API response received successfully");

    // Extract and return the assistant's response
    const assistantResponse = data.content?.[0]?.text || "Problème avec la réponse de l'API.";
    return assistantResponse;
  } catch (error) {
    console.error("Error calling Anthropic API:", error.message);
    throw error; // Re-throw pour que l'appelant puisse gérer l'erreur
  }
}
