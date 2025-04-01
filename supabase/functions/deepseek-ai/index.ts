
// Import necessary modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

// Configuration constants
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = "sk-a740a5cc62ab4570a195d92cf911fdb3";
const MODEL = "deepseek-chat";

// CORS headers configuration
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a Supabase client (for logging purposes if needed)
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to validate base64 image format
function validateBase64Image(base64String: string): boolean {
  // Check if the string starts with the correct data URI format
  return /^data:image\/(jpeg|png|gif|webp);base64,/.test(base64String);
}

// Helper function to check the size of a base64 string (in bytes)
function getBase64Size(base64String: string): number {
  // Remove the data URI prefix to get just the base64 data
  const base64Data = base64String.split(',')[1] || base64String;
  // Calculate the size: base64 encodes 3 bytes into 4 characters
  return Math.ceil(base64Data.length * 0.75);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse the request body
    const { message, screenshot } = await req.json();
    
    // Build messages for the API
    const messages = [];
    
    // Always add system message for consistent behavior
    messages.push({
      role: "system",
      content: `Tu es un assistant expert en développement d'applications web et mobile full stack. 
      Tu dois fournir des réponses techniques, précises et orientées vers la résolution de problèmes de développement.
      Tu peux suggérer des améliorations de code, des corrections de bugs, et des optimisations.
      Ton objectif est d'aider l'utilisateur à améliorer son code et ses compétences techniques.`
    });
    
    // Simple text message without screenshot
    messages.push({
      role: "user",
      content: message
    });
    console.log("Text-only message being sent (no screenshot)");
    
    // If screenshot was provided, include a notification but don't send the actual image
    // Since we know DeepSeek API is having issues with credit limits
    let imageProcessed = false;
    if (screenshot && screenshot.length > 0) {
      console.log("Screenshot detected, but will not be sent due to API limitations");
      imageProcessed = true;
    }

    // Fetch from DeepSeek API
    console.log("Sending request to DeepSeek API...");
    console.log(`Message structure preview:`, JSON.stringify(messages, null, 2).substring(0, 200) + "...");
    
    const requestBody = {
      model: MODEL,
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7,
    };
    
    console.log(`API request payload preview:`, JSON.stringify(requestBody).substring(0, 200) + "...");
    
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DeepSeek API error (${response.status}):`, errorText);
      
      // Passthrough the exact error for proper handling on client
      return new Response(
        JSON.stringify({ 
          error: `DeepSeek API responded with ${response.status}: ${errorText}`,
          suggestion: "L'API a rencontré une erreur. Essayez de désactiver les captures d'écran ou de réduire la taille de votre message."
        }),
        { 
          status: response.status, 
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          } 
        }
      );
    }

    const data = await response.json();
    console.log("DeepSeek API response received successfully");

    // Extract and return the assistant's response
    const assistantResponse = data.choices[0]?.message?.content || "Désolé, je n'ai pas pu traiter votre demande.";

    return new Response(
      JSON.stringify({ 
        response: assistantResponse,
        model: data.model,
        usage: data.usage,
        image_processed: imageProcessed
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error) {
    console.error("Error in deepseek-ai function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        suggestion: "L'API a rencontré une erreur. Essayez de désactiver les captures d'écran ou de réduire la taille de votre message."
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
