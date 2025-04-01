
// Import necessary modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

// Configuration constants
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = "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";
const MODEL = "gpt-4o";

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
      console.log("Screenshot detected, but will not be sent as OpenAI API doesn't currently support image processing through our implementation");
      imageProcessed = true;
    }

    console.log("Sending request to OpenAI API...");
    
    const requestBody = {
      model: MODEL,
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    };
    
    console.log(`API request payload preview:`, JSON.stringify(requestBody, null, 2).substring(0, 200) + "...");
    
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error (${response.status}):`, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `OpenAI API responded with ${response.status}: ${errorText}`,
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
    console.log("OpenAI API response received successfully");

    // Extract and return the assistant's response
    const assistantResponse = data.choices[0]?.message.content || "Désolé, je n'ai pas pu traiter votre demande.";

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
    console.error("Error in openai-ai function:", error);
    
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
