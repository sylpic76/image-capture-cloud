
import { toast } from 'sonner';
import { ImageProcessingStatus } from '@/types/assistant';

/**
 * Process and optimize a screenshot blob for sending to the AI
 */
export const processScreenshot = async (
  blob: Blob, 
  setImageProcessingStatus: (status: ImageProcessingStatus) => void
): Promise<string | null> => {
  try {
    console.log("Starting screenshot processing");
    
    // Create an image element to load the blob
    const img = document.createElement('img');
    
    // Convert blob to data URL
    const blobUrl = URL.createObjectURL(blob);
    
    // Wait for image to load
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = blobUrl;
    });
    
    console.log(`Original image dimensions: ${img.width}x${img.height}`);
    
    // Calculate new dimensions (max 1200px width/height)
    const MAX_DIMENSION = 1200;
    let newWidth = img.width;
    let newHeight = img.height;
    
    if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
      if (img.width >= img.height) {
        newWidth = MAX_DIMENSION;
        newHeight = Math.round(img.height * (MAX_DIMENSION / img.width));
      } else {
        newHeight = MAX_DIMENSION;
        newWidth = Math.round(img.width * (MAX_DIMENSION / img.height));
      }
    }
    
    console.log(`Resizing to: ${newWidth}x${newHeight}`);
    
    // Create a canvas to resize the image
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Draw the image on the canvas with new dimensions
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Failed to get canvas context");
    
    ctx.drawImage(img, 0, 0, newWidth, newHeight);
    
    // Convert to base64 with reduced quality
    const base64Data = canvas.toDataURL('image/jpeg', 0.8);
    
    // Log base64 preview and size
    console.log(`Base64 preview: ${base64Data.substring(0, 50)}...`);
    console.log(`Base64 format check: ${base64Data.startsWith('data:image/')}`);
    
    // Calculate size in MB
    const base64Size = Math.ceil((base64Data.length * 0.75) / (1024 * 1024));
    console.log(`Base64 size: ~${base64Size} MB`);
    
    // Clean up
    URL.revokeObjectURL(blobUrl);
    
    setImageProcessingStatus('success');
    return base64Data;
  } catch (error) {
    console.error('Error processing screenshot:', error);
    setImageProcessingStatus('error');
    toast.error("Erreur lors du traitement de la capture d'écran");
    return null;
  }
};

/**
 * Fetch the latest screenshot from the API
 */
export const fetchLatestScreenshot = async (
  setImageProcessingStatus: (status: ImageProcessingStatus) => void
): Promise<string | null> => {
  try {
    console.log("Attempting to fetch latest screenshot...");
    setImageProcessingStatus('processing');
    
    // Add cache buster to prevent browser caching
    const cacheBuster = Date.now();
    
    // Use the new last-capture function endpoint
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/last-capture?t=${cacheBuster}`;
    
    console.log(`Fetching from: ${functionUrl}`);
    
    // Fetch the signed URL from our function
    const response = await fetch(functionUrl, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error("Failed to fetch signed URL:", response.status, response.statusText);
      setImageProcessingStatus('error');
      toast.error(`Erreur lors de la récupération de l'URL signée: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.url) {
      console.error("Invalid response from function:", data);
      setImageProcessingStatus('error');
      toast.error("Réponse invalide du serveur");
      return null;
    }
    
    console.log(`Got signed URL: ${data.url.substring(0, 50)}...`);
    console.log(`Full response data:`, data);
    
    // Now fetch the actual image using the signed URL
    const imageResponse = await fetch(data.url, {
      cache: 'no-store'
    });
    
    if (!imageResponse.ok) {
      console.error("Failed to fetch image with signed URL:", imageResponse.status);
      setImageProcessingStatus('error');
      toast.error(`Erreur lors de la récupération de l'image: ${imageResponse.status}`);
      return null;
    }
    
    const blob = await imageResponse.blob();
    console.log(`Image blob fetched successfully: ${blob.size} bytes`);
      
    // Process and optimize the screenshot
    return await processScreenshot(blob, setImageProcessingStatus);
  } catch (error) {
    console.error('Erreur lors du traitement de l\'image:', error);
    toast.error("Erreur lors de la récupération de la capture d'écran");
    setImageProcessingStatus('error');
    return null;
  }
};
