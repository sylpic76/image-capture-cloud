
// Import necessary modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

// Configuration constants
const GEMINI_API_KEY = "AIzaSyCxyjxbTEJsvVrztaBLqf_janZYIHXqllk";
// API URLs for Gemini AI - Mise à jour pour utiliser v1beta avec le modèle gemini-1.5-pro pour le support des images
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

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
    
    // Expert No-Code prompt with Vision capabilities
    const systemPrompt = `Tu es FlowExpert, assistant spécialisé en développement no-code pour applications web/mobile. 
    Ton rôle est de guider pas à pas les développeurs avec des explications claires et des solutions immédiatement applicables.
    Tu analyses les captures d'écran (UI, schémas, logs) pour fournir des réponses précises.
    
    Spécialités :
    
    🔧 Outils maîtrisés : FlutterFlow (expert), Bravo, Adalo, Bubble, WeWeb, Retool.
    
    🤖 IA low-code : AppMaster, Bildr, Bolt.nov, Lobe (automatisation des workflows).
    
    📡 Connaissances à jour : Accès aux dernières docs de FlutterFlow (ex : State Management, API integrations, Custom Code).
    
    🖼️ Analyse d'images : Détection des composants UI, optimisation de layouts, debug visuel.
    
    Méthodologie :
    
    Compréhension : Reformule la demande pour confirmer le besoin.
    
    Contextualisation : "Dans FlutterFlow, cette fonction se trouve sous [Menu] > [Sous-section] car..."
    
    Action : Étapes cliquables (ex : "Clique sur 'Backend Query' > 'Add Condition' > 'Current User ID'").
    
    Alternative : Solutions cross-platform (ex : "Sur Bubble, utilise un 'Repeating Group' à la place").
    
    Ton style :
    
    🎓 Pédagogie : Vocabulaire simple, métaphores (ex : "Les 'States' sont comme des tiroirs qui stockent des données temporaires").
    
    ⚡ Efficacité : Réponses concrètes avec screenshots annotés si besoin.
    
    🔄 Mise à jour : "FlutterFlow a ajouté une nouvelle fonction hier : [Feature]. Voici comment l'utiliser..."
    
    IMPORTANT : Analyse TOUJOURS attentivement la capture d'écran fournie avant de répondre.`;
    
    // If screenshot was provided, include a notification but don't send the actual image
    let imageProcessed = false;
    let userMessage = message;
    
    console.log("Sending request to Gemini API...");
    console.log(`API URL: ${GEMINI_API_URL}`);
    
    // Format de requête pour l'API Gemini v1beta avec support d'image
    const requestBody = {
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
      console.log("Screenshot detected, processing image for Gemini Vision API");
      imageProcessed = true;
      
      // Modifier la requête pour inclure l'image
      requestBody.contents[0].parts.push({
        inlineData: {
          data: screenshot.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''), // Enlever le préfixe data:image si présent
          mimeType: screenshot.startsWith('data:image/png') ? "image/png" : "image/jpeg"
        }
      });
    }
    
    console.log(`API request payload preview:`, JSON.stringify(requestBody).substring(0, 200) + "...");
    
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

    // Extract and return the assistant's response - Format corrigé pour la version v1beta
    const assistantResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Problème avec la réponse de l'API.";

    return new Response(
      JSON.stringify({ 
        response: assistantResponse,
        model: "gemini-1.5-pro",
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
