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

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fonction pour gérer les projets (créer ou récupérer)
async function getOrCreateProject(projectName = "Default Project") {
  try {
    // Check if project exists
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('name', projectName)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Error fetching project:", fetchError);
      return null;
    }
    
    // If project exists, return it
    if (existingProject) {
      console.log(`Project found: ${existingProject.id} - ${existingProject.name}`);
      return existingProject;
    }
    
    // Otherwise, create new project
    const { data: newProject, error: insertError } = await supabase
      .from('projects')
      .insert([{ name: projectName, description: `Project created automatically on ${new Date().toISOString()}` }])
      .select('*')
      .single();
    
    if (insertError) {
      console.error("Error creating project:", insertError);
      return null;
    }
    
    console.log(`New project created: ${newProject.id} - ${newProject.name}`);
    return newProject;
  } catch (error) {
    console.error("Error in getOrCreateProject:", error);
    return null;
  }
}

// Fonction pour récupérer le profil utilisateur (ou en créer un par défaut)
async function getUserProfile() {
  try {
    const { data: profiles, error: fetchError } = await supabase
      .from('user_profile')
      .select('*')
      .limit(1);
    
    if (fetchError) {
      console.error("Error fetching user profile:", fetchError);
      return null;
    }
    
    if (profiles && profiles.length > 0) {
      return profiles[0];
    }
    
    // Create default profile if none exists
    const { data: newProfile, error: insertError } = await supabase
      .from('user_profile')
      .insert([{
        name: "Default User",
        tech_level: "intermédiaire",
        stack: ["React", "Typescript", "Supabase"]
      }])
      .select('*')
      .single();
    
    if (insertError) {
      console.error("Error creating user profile:", insertError);
      return null;
    }
    
    return newProfile;
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
}

// Fonction pour sauvegarder un message dans la mémoire du projet
async function saveToMemory(projectId, role, content) {
  try {
    const { error } = await supabase
      .from('assistant_memory')
      .insert([{
        project_id: projectId,
        role: role,
        content: content
      }]);
    
    if (error) {
      console.error("Error saving to memory:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in saveToMemory:", error);
    return false;
  }
}

// Fonction pour récupérer les derniers messages de la mémoire
async function getMemoryContext(projectId, limit = 30) {
  try {
    const { data, error } = await supabase
      .from('assistant_memory')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error("Error fetching memory:", error);
      return [];
    }
    
    return data.reverse(); // Return in chronological order
  } catch (error) {
    console.error("Error in getMemoryContext:", error);
    return [];
  }
}

// Fonction pour sauvegarder une capture d'écran dans les snapshots
async function saveScreenshot(projectId, imageUrl) {
  try {
    const { error } = await supabase
      .from('snapshots')
      .insert([{
        project_id: projectId,
        image_url: imageUrl
      }]);
    
    if (error) {
      console.error("Error saving screenshot:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in saveScreenshot:", error);
    return false;
  }
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
    const { message, screenshot, projectName } = await req.json();
    
    // Get or create the project
    const project = await getOrCreateProject(projectName || "Default Project");
    if (!project) {
      throw new Error("Failed to get or create project");
    }
    
    // Get user profile
    const userProfile = await getUserProfile();
    
    // Get memory context
    const memoryContext = await getMemoryContext(project.id);
    
    // Format memory context for the prompt
    let memoryContextText = "";
    if (memoryContext.length > 0) {
      memoryContextText = "\n\n## 📜 CONTEXTE DE LA CONVERSATION\n\n";
      memoryContext.forEach(entry => {
        memoryContextText += `${entry.role === 'user' ? '👤' : '🤖'} ${entry.content.substring(0, 200)}${entry.content.length > 200 ? '...' : ''}\n\n`;
      });
    }
    
    // Save user message to memory
    await saveToMemory(project.id, 'user', message);
    
    // Process screenshot if provided
    let imageProcessed = false;
    let userMessage = message;
    
    if (screenshot && screenshot.length > 0) {
      console.log("Screenshot detected, processing image for Gemini Vision API");
      imageProcessed = true;
      
      // Save screenshot to snapshots
      await saveScreenshot(project.id, "data:image/jpeg;base64," + screenshot);
    }
    
    // Nouveau prompt expert avec mémoire Supabase
    const systemPrompt = `Tu es un assistant IA intelligent et structuré avec une mémoire complète via Supabase. Tu assistes ton utilisateur dans le développement de projets digitaux, et tu construis une mémoire exploitable, intelligente et durable.

Voici comment tu fonctionnes :

---

## 🧠 PROFIL DE L'UTILISATEUR

- Tu interroges \`user_profile\` au démarrage
- Tu adaptes ton langage et tes explications à son \`tech_level\`
- Tu respectes ses préférences techniques (\`stack\`)

---

## 📁 PROJETS

- Chaque interaction est liée à un projet
- Si l'utilisateur ne précise pas, tu poses la question
- Tu crées le projet automatiquement s'il n'existe pas (\`projects\`)

---

## 💬 MÉMOIRE DE CONVERSATION PAR PROJET

- Tu enregistres chaque échange dans \`assistant_memory\`
- Tu consultes les **30 derniers messages** avant de répondre
- Tu résumes automatiquement les discussions longues si besoin

---

## 🐞 BUGS ET FIXES

- Quand un bug est mentionné → tu l'enregistres dans \`bugs\`
- Tu documentes la cause, la solution, et le nom de l'outil
- Si le même bug revient → tu proposes la solution déjà testée

---

## 🧪 TESTS ÉCHOUÉS

- Si une tentative technique échoue (test API, lib instable, etc) → tu l'enregistres dans \`test_failures\`
- Tu indiques pourquoi ça n'a pas marché (ex : bug lib, mauvaise méthode)

---

## 🌐 PAGES WEB / URL / CONTENU EXTERNE

- Si une capture contient une URL → tu analyses la page
- Tu extrais le contenu HTML et tu enregistres un résumé dans \`web_resources\`
- Tu peux enrichir ta réponse avec ce contenu

---

## 📸 CAPTURES D'ÉCRAN

- Tu stockes toutes les captures dans \`snapshots\`
- Si un contenu ou URL est visible → tu le relis à la mémoire projet

---

## 💡 INSIGHTS / BONNES PRATIQUES

- Dès qu'une idée, astuce, bonne pratique est évoquée → tu la notes dans \`insights\`
- Tu peux les rappeler sur demande : "montre-moi toutes les bonnes pratiques du projet X"

---

## 📌 TOUJOURS UTILISER LES ENDPOINTS SUPABASE :

- \`POST /rest/v1/projects\`
- \`GET /rest/v1/projects?name=eq.nom\`
- \`POST /rest/v1/assistant_memory\`
- \`GET /rest/v1/assistant_memory?project_id=eq.uuid&order=created_at.asc&limit=30\`
- \`POST /rest/v1/bugs\`, \`test_failures\`, \`snapshots\`, \`web_resources\`, \`insights\`
- Headers :
  - \`apikey\`: ta clé publique
  - \`Authorization: Bearer <KEY>\`
  - \`Content-Type: application/json\`

---

🎯 TON OBJECTIF :  
Créer un **assistant développeur avec une mémoire parfaite**, qui évite les erreurs passées, réutilise tout le contexte, apprend des bugs, documente tout ce qui est utile pour livrer mieux, plus vite, sans jamais repartir de zéro.

Et en plus de cela, tu es FlowExpert, assistant spécialisé en développement no-code pour applications web/mobile. 
Tu guides pas à pas les développeurs avec des explications claires et des solutions immédiatement applicables.
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

IMPORTANT : Analyse TOUJOURS attentivement la capture d'écran fournie avant de répondre.

${userProfile ? `\n## 👤 PROFIL UTILISATEUR\nNom: ${userProfile.name}\nNiveau technique: ${userProfile.tech_level || 'Non spécifié'}\nStack: ${userProfile.stack ? userProfile.stack.join(', ') : 'Non spécifiée'}\n` : ''}

${project ? `\n## 🗂️ PROJET ACTUEL\nNom: ${project.name}\nID: ${project.id}\n` : ''}

${memoryContextText}`;
    
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

    // Save assistant response to memory
    await saveToMemory(project.id, 'assistant', assistantResponse);

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
