
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME", "screenshots")

# Screenshot configuration
SCREENSHOT_INTERVAL = 30  # seconds
RETENTION_PERIOD = 30 * 60  # 30 minutes in seconds

# File paths
APP_DIR = Path.home() / "LiveScreenUploader"
TEMP_DIR = APP_DIR / "temp"

# Create necessary directories
APP_DIR.mkdir(exist_ok=True)
TEMP_DIR.mkdir(exist_ok=True)
