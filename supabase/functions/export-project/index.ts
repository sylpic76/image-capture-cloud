
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

// Configure CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase client
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
    // Get project ID from URL params
    const url = new URL(req.url);
    const projectId = url.searchParams.get("id");
    
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    console.log(`📦 Exporting project data for project ID: ${projectId}`);
    
    // 1. Get project details
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();
    
    if (projectError) {
      throw new Error(`Error fetching project: ${projectError.message}`);
    }
    
    if (!projectData) {
      throw new Error(`Project not found with ID: ${projectId}`);
    }
    
    // 2. Fetch all related data
    const [
      { data: messages, error: messagesError },
      { data: bugs, error: bugsError },
      { data: snapshots, error: snapshotsError },
      { data: insights, error: insightsError },
      { data: testFailures, error: testFailuresError },
      { data: webResources, error: webResourcesError }
    ] = await Promise.all([
      supabase.from("assistant_memory").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
      supabase.from("bugs").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("snapshots").select("*").eq("project_id", projectId).order("added_at", { ascending: false }),
      supabase.from("insights").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("test_failures").select("*").eq("project_id", projectId).order("tried_on", { ascending: false }),
      supabase.from("web_resources").select("*").eq("project_id", projectId).order("added_at", { ascending: false })
    ]);
    
    if (messagesError) console.error("Error fetching messages:", messagesError);
    if (bugsError) console.error("Error fetching bugs:", bugsError);
    if (snapshotsError) console.error("Error fetching snapshots:", snapshotsError);
    if (insightsError) console.error("Error fetching insights:", insightsError);
    if (testFailuresError) console.error("Error fetching test failures:", testFailuresError);
    if (webResourcesError) console.error("Error fetching web resources:", webResourcesError);
    
    // 3. Generate Markdown
    let markdown = `# Project Export: ${projectData.name}\n\n`;
    markdown += `**Description:** ${projectData.description || "No description"}\n`;
    markdown += `**Created at:** ${new Date(projectData.created_at).toLocaleString()}\n\n`;
    
    // Add conversation history
    markdown += `## Conversation History\n\n`;
    if (messages && messages.length > 0) {
      messages.forEach((msg, i) => {
        const role = msg.role === 'user' ? '👤 **User**' : '🤖 **Assistant**';
        markdown += `### ${role} - ${new Date(msg.created_at).toLocaleString()}\n\n${msg.content}\n\n`;
        if (i < messages.length - 1) markdown += `---\n\n`;
      });
    } else {
      markdown += `No conversation history found.\n\n`;
    }
    
    // Add bugs
    markdown += `## Bugs\n\n`;
    if (bugs && bugs.length > 0) {
      bugs.forEach((bug) => {
        markdown += `### 🐛 ${bug.title || "Issue"} (${new Date(bug.created_at).toLocaleDateString()})\n\n`;
        markdown += `**Tool:** ${bug.tool || "Unknown"}\n`;
        markdown += `**Description:** ${bug.description}\n`;
        markdown += `**Cause:** ${bug.cause || "Unknown"}\n`;
        markdown += `**Fix:** ${bug.fix || "Not resolved yet"}\n\n`;
      });
    } else {
      markdown += `No bugs reported.\n\n`;
    }
    
    // Add insights
    markdown += `## Insights & Best Practices\n\n`;
    if (insights && insights.length > 0) {
      insights.forEach((insight) => {
        markdown += `### 💡 ${insight.type || "Insight"}\n\n`;
        markdown += `${insight.summary}\n\n`;
        markdown += `*Added on ${new Date(insight.created_at).toLocaleDateString()}*\n\n`;
      });
    } else {
      markdown += `No insights recorded.\n\n`;
    }
    
    // Add test failures
    markdown += `## Test Failures\n\n`;
    if (testFailures && testFailures.length > 0) {
      testFailures.forEach((test) => {
        markdown += `### 🧪 Test Failure (${new Date(test.tried_on).toLocaleDateString()})\n\n`;
        markdown += `**Description:** ${test.description || "No description"}\n`;
        markdown += `**Reason:** ${test.why_it_failed || "Unknown reason"}\n\n`;
      });
    } else {
      markdown += `No test failures recorded.\n\n`;
    }
    
    // Add web resources
    markdown += `## Web Resources\n\n`;
    if (webResources && webResources.length > 0) {
      webResources.forEach((resource) => {
        markdown += `### 🌐 [${resource.title || resource.url}](${resource.url})\n\n`;
        markdown += `${resource.extracted_text || "No summary available"}\n\n`;
        markdown += `*Added on ${new Date(resource.added_at).toLocaleDateString()}*\n\n`;
      });
    } else {
      markdown += `No web resources collected.\n\n`;
    }
    
    // Add snapshot references (not the actual images)
    markdown += `## Snapshots\n\n`;
    if (snapshots && snapshots.length > 0) {
      markdown += `${snapshots.length} snapshots captured for this project.\n\n`;
    } else {
      markdown += `No snapshots captured.\n\n`;
    }
    
    // Return the markdown
    return new Response(JSON.stringify({ markdown }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
    
  } catch (error) {
    console.error("❌ Error in export-project function:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        response: `Error: ${error.message}`
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
