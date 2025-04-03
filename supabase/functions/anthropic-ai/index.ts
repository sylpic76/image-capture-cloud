
// Import necessary modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./config.ts";
import { 
  getOrCreateProject, 
  getUserProfile,
  saveToMemory,
  getMemoryContext,
  saveScreenshot
} from "./db.ts";
import { 
  analyzeContent, 
  logBug,
  detectAndSaveInsights 
} from "./memory-enrichment.ts";
import { processGeminiRequest } from "./ai-service.ts";
import { buildSystemPrompt, formatMemoryContext } from "./prompt-builder.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse the request body and log received parameters
    const requestBody = await req.json();
    console.log("📥 Received request body:", JSON.stringify({
      message: requestBody.message ? "Message present (length: " + requestBody.message.length + ")" : "No message",
      screenshot: requestBody.screenshot ? "Screenshot present" : "No screenshot",
      projectName: requestBody.projectName || "Not provided",
    }));
    
    const { message, screenshot, projectName } = requestBody;
    
    // Log project information
    console.log("🏢 Project name received:", projectName || "Default Project");
    
    // Get or create the project
    const project = await getOrCreateProject(projectName || "Default Project");
    if (!project) {
      throw new Error("Failed to get or create project");
    }
    
    console.log(`🔍 Using project: ${project.id} - ${project.name}`);
    
    // Get user profile
    const userProfile = await getUserProfile();
    
    // Get memory context
    const memoryContext = await getMemoryContext(project.id);
    
    // Format memory context for the prompt
    const memoryContextText = formatMemoryContext(memoryContext);
    
    // Analyse du contenu utilisateur et enrichissement de la mémoire
    await analyzeContent(project.id, message, 'user');
    
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
    
    // Build the system prompt
    const systemPrompt = buildSystemPrompt(userProfile, project, memoryContextText);
    
    try {
      // Process the request with Gemini
      const assistantResponse = await processGeminiRequest(
        systemPrompt, 
        userMessage, 
        screenshot
      );
      
      // Save assistant response to memory
      await saveToMemory(project.id, 'assistant', assistantResponse);
      
      // Analyser la réponse de l'assistant pour des insights
      await detectAndSaveInsights(project.id, assistantResponse);
      
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
      
    } catch (aiError) {
      console.error(`Gemini API error: ${aiError.message}`);
      
      // Log the error as a bug
      await logBug(project.id, aiError.message, "Gemini API");
      
      return new Response(
        JSON.stringify({ 
          error: aiError.message,
          response: `Erreur API Gemini: ${aiError.message}`
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

  } catch (error) {
    console.error("❌ Error in anthropic-ai function:", error);
    
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
