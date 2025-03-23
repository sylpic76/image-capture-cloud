
# LiveScreenUploader

A minimalist desktop application that automatically captures screenshots at regular intervals and uploads them to Supabase storage.

## Features

- 📷 Takes screenshots automatically every 30 seconds
- 🗑️ Cleans up screenshots older than 30 minutes
- ☁️ Uploads screenshots to a public Supabase bucket
- 📊 Logs each upload with timestamp and URL
- ⏯️ Simple Start/Pause interface

## Purpose

This application is designed to help AI agents (like GPT-4) analyze what's happening on a user's screen in real-time by providing access to the most recent screenshots. The AI can use these visual cues along with a GitHub repository to provide context-aware assistance.

## Installation

### Prerequisites

- Python 3.10 or higher
- Supabase account with:
  - Storage bucket created
  - Database table `screenshot_log` with columns:
    - `image_url` (text)
    - `created_at` (timestamp)

### Setup

1. **Clone the repository**
   ```
   git clone https://github.com/yourusername/LiveScreenUploader.git
   cd LiveScreenUploader
   ```

2. **Install dependencies**
   ```
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   - Create a `.env` file based on the provided `.env.example`
   ```
   SUPABASE_URL=https://your-project-url.supabase.co
   SUPABASE_API_KEY=your-supabase-api-key
   BUCKET_NAME=screenshots
   ```

4. **Run the application**
   ```
   cd src
   python main.py
   ```

## Supabase Setup

1. Create a new Supabase project
2. Create a new storage bucket named "screenshots" (or your preferred name)
   - Make sure to set the bucket to public
3. Create a new table called `screenshot_log` with the following structure:
   ```sql
   CREATE TABLE screenshot_log (
     id SERIAL PRIMARY KEY,
     image_url TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
   );
   ```
4. Get your Supabase URL and API key from the project settings
5. Add these values to your `.env` file

## Using the Application

1. Start the application
2. Click the "Start Capturing" button to begin automatic screenshots
3. The interface will show a countdown timer for the next screenshot
4. Recent uploads will appear in the list below with timestamps
5. Click "Pause Capturing" to temporarily stop the process
6. The application will automatically delete screenshots older than 30 minutes

## Packaging for Distribution

You can package this application into a standalone executable using PyInstaller:

```
pip install pyinstaller
pyinstaller --onefile --windowed --add-data ".env;." src/main.py
```

The executable will be created in the `dist` directory.

## Customization

You can modify the application's behavior by editing the `config.py` file:

- `SCREENSHOT_INTERVAL`: Time between screenshots (in seconds)
- `RETENTION_PERIOD`: How long to keep screenshots (in seconds)

## License

MIT

## Acknowledgments

- This project uses [PyAutoGUI](https://pyautogui.readthedocs.io) for screenshot capture
- [Supabase](https://supabase.com) provides the backend infrastructure
- [PyQt6](https://www.riverbankcomputing.com/software/pyqt/) powers the user interface
