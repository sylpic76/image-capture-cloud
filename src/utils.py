
import os
import time
import pyautogui
from datetime import datetime, timedelta
from pathlib import Path
import logging
from supabase import create_client
from PIL import Image
import io

from config import SUPABASE_URL, SUPABASE_API_KEY, BUCKET_NAME, TEMP_DIR, RETENTION_PERIOD

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Supabase client
if not SUPABASE_URL or not SUPABASE_API_KEY:
    logger.error("Supabase configuration missing. Please check your .env file.")
    supabase = None
else:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_API_KEY)
        logger.info("Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        supabase = None

def take_screenshot():
    """Take a screenshot and save it to the temporary directory"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"screen_{timestamp}.png"
    file_path = TEMP_DIR / filename
    
    try:
        # Take screenshot
        screenshot = pyautogui.screenshot()
        screenshot.save(file_path)
        logger.info(f"Screenshot taken: {filename}")
        return file_path, timestamp
    except Exception as e:
        logger.error(f"Failed to take screenshot: {e}")
        return None, timestamp

def upload_to_supabase(file_path):
    """Upload screenshot to Supabase storage and record in database"""
    if not supabase:
        logger.error("Supabase client not initialized")
        return None
    
    if not file_path or not file_path.exists():
        logger.error(f"File not found: {file_path}")
        return None
    
    try:
        # Read the file and optimize it
        with Image.open(file_path) as img:
            # Convert to RGB if it's not (in case of screenshots with alpha channel)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Create an in-memory file
            buffer = io.BytesIO()
            img.save(buffer, format="PNG", optimize=True)
            buffer.seek(0)
            
            # Upload to Supabase
            file_name = file_path.name
            result = supabase.storage.from_(BUCKET_NAME).upload(
                file_name, 
                buffer.read(), 
                {"content-type": "image/png"}
            )
            
            # Get public URL
            public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)
            
            # Log to database
            timestamp = datetime.utcnow().isoformat()
            supabase.table("screenshot_log").insert({
                "image_url": public_url,
                "created_at": timestamp
            }).execute()
            
            logger.info(f"Uploaded to Supabase: {public_url}")
            return public_url
    except Exception as e:
        logger.error(f"Failed to upload to Supabase: {e}")
        return None

def cleanup_old_files():
    """Delete screenshots older than the retention period"""
    try:
        # Calculate the cutoff time
        cutoff_time = datetime.now() - timedelta(seconds=RETENTION_PERIOD)
        
        # Get all files in the temp directory
        for file_path in TEMP_DIR.glob("screen_*.png"):
            # Extract timestamp from filename (screen_YYYYMMDD_HHMMSS.png)
            try:
                file_name = file_path.name
                date_part = file_name[7:15]  # YYYYMMDD
                time_part = file_name[16:22]  # HHMMSS
                file_timestamp = datetime.strptime(f"{date_part}_{time_part}", "%Y%m%d_%H%M%S")
                
                # Delete if older than cutoff
                if file_timestamp < cutoff_time:
                    file_path.unlink()
                    logger.info(f"Deleted old screenshot: {file_name}")
            except Exception as e:
                logger.warning(f"Could not parse timestamp for {file_path.name}: {e}")
                
        # Also clean up Supabase if needed (optional, as it might cost API calls)
        # This would require listing objects and deleting old ones
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
