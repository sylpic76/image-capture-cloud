
// Import necessary modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

// Configuration constants
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_KEY = "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";
const MODEL = "claude-3-haiku-20240307";

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
    const messages = [];
    
    // System message for consistent behavior
    const systemMessage = `Tu es un assistant expert en développement d'applications web et mobile full stack. 
    Tu dois fournir des réponses techniques, précises et orientées vers la résolution de problèmes de développement.
    Tu peux suggérer des améliorations de code, des corrections de bugs, et des optimisations.
    Ton objectif est d'aider l'utilisateur à améliorer son code et ses compétences techniques.`;
    
    // If screenshot was provided, include a notification but don't send the actual image
    // Since we don't have image processing support currently
    let imageProcessed = false;
    let userMessage = message;
    
    if (screenshot && screenshot.length > 0) {
      console.log("Screenshot detected, but will not be sent as Claude doesn't currently support image processing through our implementation");
      imageProcessed = true;
    }

    console.log("Sending request to Anthropic API...");
    
    const requestBody = {
      model: MODEL,
      messages: [
        {
          role: "user",
          content: userMessage
        }
      ],
      system: systemMessage,
      max_tokens: 2000,
      temperature: 0.7,
    };
    
    console.log(`API request payload preview:`, JSON.stringify(requestBody, null, 2).substring(0, 200) + "...");
    
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Anthropic API error (${response.status}):`, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `Anthropic API responded with ${response.status}: ${errorText}`,
          suggestion: "L'API a rencontré une erreur. Veuillez réessayer votre message."
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
    console.log("Anthropic API response received successfully");

    // Extract and return the assistant's response
    const assistantResponse = data.content[0]?.text || "Désolé, je n'ai pas pu traiter votre demande.";

    return new Response(
      JSON.stringify({ 
        response: assistantResponse,
        model: data.model,
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
    console.error("Error in anthropic-ai function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        suggestion: "L'API a rencontré une erreur. Veuillez réessayer votre message."
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
