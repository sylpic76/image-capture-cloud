
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
    let messages = [];
    
    // Always add system message for consistent behavior
    messages.push({
      role: "system",
      content: `Tu es un assistant expert en développement d'applications web et mobile full stack. 
      Tu dois fournir des réponses techniques, précises et orientées vers la résolution de problèmes de développement.
      Tu peux suggérer des améliorations de code, des corrections de bugs, et des optimisations.
      Ton objectif est d'aider l'utilisateur à améliorer son code et ses compétences techniques.`
    });
    
    // If screenshot is available, add it as a simple text message for now
    // DeepSeek might not fully support image inputs in the same way as other models
    if (screenshot && screenshot.length > 0) {
      console.log("Screenshot detected, adding as text context");
      
      // Add a simple text message mentioning the screenshot context
      messages.push({
        role: "user",
        content: `Je te partage le contexte suivant: J'ai une capture d'écran de mon application 
        mais je ne peux pas te l'envoyer directement. Ma question est: ${message}`
      });
    } else {
      // Simple text message without screenshot
      messages.push({
        role: "user",
        content: message
      });
    }

    // Fetch from DeepSeek API
    console.log("Sending request to DeepSeek API...");
    console.log("Messages structure:", JSON.stringify(messages).substring(0, 100) + "...");
    
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("DeepSeek API error:", error);
      throw new Error(`DeepSeek API responded with ${response.status}: ${error}`);
    }

    const data = await response.json();
    console.log("DeepSeek API response received");

    // Extract and return the assistant's response
    const assistantResponse = data.choices[0]?.message?.content || "Désolé, je n'ai pas pu traiter votre demande.";

    return new Response(
      JSON.stringify({ 
        response: assistantResponse,
        model: data.model,
        usage: data.usage
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
        error: error.message 
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
