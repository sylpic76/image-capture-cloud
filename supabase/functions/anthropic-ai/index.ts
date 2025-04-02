
// Import necessary modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

// Configuration constants
const GEMINI_API_KEY = "AIzaSyCxyjxbTEJsvVrztaBLqf_janZYIHXqllk";
// API URLs for Gemini AI - explicitly specifying the correct versions
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent";

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
    const systemInstruction = `Tu es un assistant expert en développement d'applications web et mobile full stack. 
    Tu dois fournir des réponses techniques, précises et orientées vers la résolution de problèmes de développement.
    Tu peux suggérer des améliorations de code, des corrections de bugs, et des optimisations.
    Ton objectif est d'aider l'utilisateur à améliorer son code et ses compétences techniques.`;
    
    // If screenshot was provided, include a notification but don't send the actual image
    // Since we don't have image processing support currently
    let imageProcessed = false;
    let userMessage = message;
    
    if (screenshot && screenshot.length > 0) {
      console.log("Screenshot detected, but will not be sent as image processing isn't currently implemented");
      imageProcessed = true;
    }

    console.log("Sending request to Gemini API...");
    console.log(`API URL: ${GEMINI_API_URL}`);
    
    // Request format for Gemini API v1
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: userMessage }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      }
    };
    
    // Include system instruction
    if (systemInstruction) {
      requestBody.contents.unshift({
        role: "system",
        parts: [{ text: systemInstruction }]
      });
    }
    
    console.log(`API request payload preview:`, JSON.stringify(requestBody, null, 2).substring(0, 200) + "...");
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `Gemini API responded with ${response.status}: ${errorText}`,
          response: `Erreur API Gemini (${response.status}): ${errorText}`
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
    console.log("Gemini API response received successfully");

    // Extract and return the assistant's response 
    const assistantResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Problème avec la réponse de l'API.";

    return new Response(
      JSON.stringify({ 
        response: assistantResponse,
        model: "gemini-pro",
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
    console.error("Error in gemini-ai function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: `Erreur technique: ${error.message}`
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
