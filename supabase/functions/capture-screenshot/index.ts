
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
  // Generate a unique request ID for tracking
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[${requestId}] Starting screenshot upload request`)
  
  // Log request details
  console.log(`[${requestId}] Request method: ${req.method}`)
  console.log(`[${requestId}] Request headers:`, Object.fromEntries([...req.headers.entries()]))

  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    console.log(`[${requestId}] Handling OPTIONS preflight request with enhanced CORS`)
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }
  
  // Get the API key from the header
  const apiKey = req.headers.get('apikey') || req.headers.get('authorization')?.split(' ')[1]
  
  if (!apiKey) {
    console.error(`[${requestId}] Missing required API key`)
    return new Response(
      JSON.stringify({ error: "Missing API key" }),
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
    console.log(`[${requestId}] Received image data: ${buffer.length} bytes, content-type: ${req.headers.get('Content-Type') || 'image/png'}`)
    
    // Generate a unique name for the screenshot
    const timestamp = new Date().toISOString().replace(/[:\.]/g, '').substring(0, 15)
    const filename = `screen_${timestamp}.png`
    console.log(`[${requestId}] Generated filename: ${filename}`)
    
    // Initialize Supabase client with environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${requestId}] Missing Supabase environment variables: URL=${!!supabaseUrl}, SERVICE_KEY=${!!supabaseServiceKey}`)
      throw new Error("Server configuration error: Missing environment variables")
    }
    
    console.log(`[${requestId}] Initializing Supabase client with URL: ${supabaseUrl}`)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Store the image in the screenshots bucket
    console.log(`[${requestId}] Uploading image to 'screenshots' bucket`)
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('screenshots')
      .upload(filename, buffer, {
        contentType: 'image/png',
        upsert: true,
      })
    
    if (uploadError) {
      console.error(`[${requestId}] Upload error details:`, uploadError)
      throw new Error(`Storage upload error: ${uploadError.message || JSON.stringify(uploadError)}`)
    }
    
    console.log(`[${requestId}] Upload successful:`, uploadData)

    // Create a signed URL for the uploaded file with 24-hour expiration
    console.log(`[${requestId}] Creating signed URL for ${filename}`)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin
      .storage
      .from('screenshots')
      .createSignedUrl(filename, 60 * 60 * 24) // 24 hours expiry
    
    if (signedUrlError) {
      console.error(`[${requestId}] Signed URL error details:`, signedUrlError)
      throw new Error(`Signed URL error: ${signedUrlError.message || JSON.stringify(signedUrlError)}`)
    }
    
    const imageUrl = signedUrlData.signedUrl
    console.log(`[${requestId}] Signed URL created successfully: ${imageUrl.substring(0, 100)}...`)
    
    // COMMENTED OUT: Database insert operation that was causing the issue
    // console.log(`[${requestId}] Logging screenshot in database`)
    // const { data: logData, error: logError } = await supabaseAdmin
    //   .from('screenshot_log')
    //   .insert([
    //     { 
    //       image_url: imageUrl,
    //       file_name: filename,
    //       file_size: buffer.length,
    //     },
    //   ])
    //   .select()
    // 
    // if (logError) {
    //   console.error(`[${requestId}] Database log error details:`, logError)
    //   throw new Error(`Database error: ${logError.message || JSON.stringify(logError)}`)
    // }
    // 
    // console.log(`[${requestId}] Database log successful:`, logData)

    // Return the signed image URL
    console.log(`[${requestId}] Request completed successfully`)
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
    // Enhanced error logging
    console.error(`[${requestId}] Error processing screenshot:`, error)
    console.error(`[${requestId}] Error stack trace:`, error.stack)
    
    // Return detailed error information
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error occurred",
        details: String(error),
        timestamp: new Date().toISOString()
      }),
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
