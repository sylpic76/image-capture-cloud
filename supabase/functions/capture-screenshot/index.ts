
// Import necessary modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.0"

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-auth",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }
  
  // Get the JWT token from the authorization header
  const authHeader = req.headers.get('authorization')
  const apiKey = req.headers.get('apikey')
  
  if (!authHeader || !apiKey) {
    console.error("Missing required authentication headers")
    return new Response(
      JSON.stringify({ error: "Missing authentication credentials" }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    )
  }

  try {
    // Parse the request to get the screenshot data
    const base64Image = await req.arrayBuffer()
    const buffer = new Uint8Array(base64Image)
    
    // Generate a unique name for the screenshot
    const timestamp = new Date().toISOString().replace(/[:\.]/g, '').substring(0, 15)
    const filename = `screen_${timestamp}.png`
    
    // Initialize Supabase client with the ANON key and pass along the auth header
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    
    // Store the image in the screenshots bucket
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('screenshots')
      .upload(filename, buffer, {
        contentType: 'image/png',
        upsert: true,
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Storage error: ${uploadError.message}`)
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = await supabaseAdmin
      .storage
      .from('screenshots')
      .getPublicUrl(filename)

    const imageUrl = urlData.publicUrl
    
    // Log the screenshot in the database
    const { data: logData, error: logError } = await supabaseAdmin
      .from('screenshot_log')
      .insert([
        { 
          image_url: imageUrl,
          file_name: filename,
          file_size: buffer.length,
        },
      ])
      .select()
    
    if (logError) {
      console.error('Database log error:', logError)
      throw new Error(`Database error: ${logError.message}`)
    }

    // Return the image URL
    return new Response(
      JSON.stringify({ url: imageUrl }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    )
  } catch (error) {
    console.error('Error processing screenshot:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    )
  }
})
