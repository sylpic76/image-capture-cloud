import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Project management functions
export async function getOrCreateProject(projectName = "Default Project") {
  console.log("🧠 Creating or fetching project:", projectName);
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
      console.log(`✅ Project found: ${existingProject.id} - ${existingProject.name}`);
      return existingProject;
    }
    
    // Otherwise, create new project
    const { data: newProject, error: insertError } = await supabase
      .from('projects')
      .insert([{ name: projectName, description: `Project created automatically on ${new Date().toISOString()}` }])
      .select('*')
      .single();
    
    if (insertError) {
      console.error("❌ Error creating project:", insertError);
      return null;
    }
    
    console.log(`✅ New project created: ${newProject.id} - ${newProject.name}`);
    return newProject;
  } catch (error) {
    console.error("❌ Error in getOrCreateProject:", error);
    return null;
  }
}

// User profile functions
export async function getUserProfile() {
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

// Memory management functions
export async function saveToMemory(projectId, role, content) {
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

export async function getMemoryContext(projectId, limit = 30) {
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

export async function saveScreenshot(projectId, imageUrl) {
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
