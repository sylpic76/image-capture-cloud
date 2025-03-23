
import sys
import time
import threading
import schedule
from datetime import datetime
from pathlib import Path

from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QObject, pyqtSignal, QThread

from config import SCREENSHOT_INTERVAL
from ui import MainWindow
from utils import take_screenshot, upload_to_supabase, cleanup_old_files, logger

class ScreenshotWorker(QObject):
    log_signal = pyqtSignal(str, str)
    
    def __init__(self):
        super().__init__()
        self.running = False
        self.thread = None
    
    def start_capturing(self):
        if self.thread and self.thread.is_alive():
            return
            
        self.running = True
        self.thread = threading.Thread(target=self.capture_loop)
        self.thread.daemon = True
        self.thread.start()
    
    def stop_capturing(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)
    
    def capture_loop(self):
        # Take initial screenshot immediately
        self.capture_and_upload()
        
        # Then schedule at regular intervals
        while self.running:
            time.sleep(SCREENSHOT_INTERVAL)
            if self.running:  # Check again to avoid capture after stop
                self.capture_and_upload()
    
    def capture_and_upload(self):
        # Take screenshot
        file_path, timestamp = take_screenshot()
        if file_path:
            # Upload to Supabase
            url = upload_to_supabase(file_path)
            if url:
                # Format timestamp for display
                display_time = datetime.now().strftime("%H:%M:%S")
                self.log_signal.emit(f"Uploaded: {file_path.name}", display_time)
            
            # Clean up old files
            cleanup_old_files()

def main():
    app = QApplication(sys.argv)
    
    # Set up the main window
    window = MainWindow()
    
    # Create worker for background tasks
    worker = ScreenshotWorker()
    worker.log_signal.connect(window.add_log_entry)
    
    # Connect signals
    window.start_signal.connect(worker.start_capturing)
    window.pause_signal.connect(worker.stop_capturing)
    
    # Show window
    window.show()
    
    # Start the application event loop
    return app.exec()

if __name__ == "__main__":
    sys.exit(main())
