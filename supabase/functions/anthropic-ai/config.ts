
// Configuration constants
export const ANTHROPIC_API_KEY = "your-anthropic-key-will-be-set-via-env"; // Will be set via env
export const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// CORS headers configuration - plus permissive pour le développement
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Max-Age": "1728000",
};
