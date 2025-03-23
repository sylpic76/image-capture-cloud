
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QPushButton, 
    QLabel, QFrame, QListWidget, QListWidgetItem, QHBoxLayout
)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QSize
from PyQt6.QtGui import QFont, QColor, QPalette, QIcon, QPixmap

class LogItem(QFrame):
    """Custom widget for displaying log entries with a clean design"""
    def __init__(self, message, timestamp, parent=None):
        super().__init__(parent)
        self.setFrameShape(QFrame.Shape.StyledPanel)
        self.setFixedHeight(60)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setObjectName("logItem")
        self.setStyleSheet("""
            #logItem {
                background-color: rgba(255, 255, 255, 0.7);
                border-radius: 8px;
                margin: 2px;
            }
        """)
        
        layout = QHBoxLayout(self)
        layout.setContentsMargins(10, 5, 10, 5)
        
        # Icon or indicator
        indicator = QLabel()
        indicator.setFixedSize(QSize(12, 12))
        indicator.setStyleSheet("background-color: #4CAF50; border-radius: 6px;")
        
        # Message and timestamp
        text_layout = QVBoxLayout()
        text_layout.setSpacing(2)
        
        msg_label = QLabel(message)
        msg_label.setFont(QFont("Arial", 9))
        
        time_label = QLabel(timestamp)
        time_label.setFont(QFont("Arial", 8))
        time_label.setStyleSheet("color: #666;")
        
        text_layout.addWidget(msg_label)
        text_layout.addWidget(time_label)
        
        layout.addWidget(indicator)
        layout.addLayout(text_layout, 1)

class MainWindow(QMainWindow):
    start_signal = pyqtSignal()
    pause_signal = pyqtSignal()
    
    def __init__(self):
        super().__init__()
        self.is_capturing = False
        self.countdown = 30
        self.initUI()
        
    def initUI(self):
        self.setWindowTitle("LiveScreenUploader")
        self.setMinimumSize(400, 500)
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f5f5f7;
            }
            QLabel#statusLabel {
                color: #333;
                font-size: 14px;
            }
            QLabel#countdownLabel {
                color: #666;
                font-size: 12px;
            }
            QPushButton#toggleButton {
                background-color: #0071e3;
                color: white;
                border: none;
                border-radius: 10px;
                padding: 10px 20px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton#toggleButton:hover {
                background-color: #0077ed;
            }
            QPushButton#toggleButton:pressed {
                background-color: #005bb5;
            }
            QListWidget {
                background-color: rgba(245, 245, 247, 0.8);
                border: none;
                border-radius: 10px;
                padding: 5px;
            }
            QFrame#statusFrame {
                background-color: rgba(255, 255, 255, 0.8);
                border-radius: 12px;
            }
            QFrame#countdownFrame {
                background-color: rgba(255, 255, 255, 0.6);
                border-radius: 10px;
            }
        """)
        
        # Central widget and main layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(15)
        
        # Status frame
        status_frame = QFrame()
        status_frame.setObjectName("statusFrame")
        status_frame.setMinimumHeight(80)
        status_layout = QVBoxLayout(status_frame)
        
        # Status label
        self.status_label = QLabel("Status: Paused")
        self.status_label.setObjectName("statusLabel")
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        status_layout.addWidget(self.status_label)
        
        # Countdown frame
        countdown_frame = QFrame()
        countdown_frame.setObjectName("countdownFrame")
        countdown_layout = QHBoxLayout(countdown_frame)
        
        # Countdown label
        self.countdown_label = QLabel("Next screenshot in: --")
        self.countdown_label.setObjectName("countdownLabel")
        self.countdown_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        countdown_layout.addWidget(self.countdown_label)
        
        status_layout.addWidget(countdown_frame)
        main_layout.addWidget(status_frame)
        
        # Toggle button
        self.toggle_button = QPushButton("Start Capturing")
        self.toggle_button.setObjectName("toggleButton")
        self.toggle_button.setMinimumHeight(50)
        self.toggle_button.clicked.connect(self.toggle_capture)
        main_layout.addWidget(self.toggle_button)
        
        # Recent logs
        log_label = QLabel("Recent Uploads")
        log_label.setAlignment(Qt.AlignmentFlag.AlignLeft)
        main_layout.addWidget(log_label)
        
        self.log_list = QListWidget()
        self.log_list.setSpacing(5)
        main_layout.addWidget(self.log_list)
        
        # Timer for countdown
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.update_countdown)
        
    def toggle_capture(self):
        self.is_capturing = not self.is_capturing
        
        if self.is_capturing:
            self.status_label.setText("Status: Active")
            self.toggle_button.setText("Pause Capturing")
            self.toggle_button.setStyleSheet("""
                QPushButton#toggleButton {
                    background-color: #ff3b30;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    padding: 10px 20px;
                    font-size: 14px;
                    font-weight: bold;
                }
                QPushButton#toggleButton:hover {
                    background-color: #ff4f45;
                }
                QPushButton#toggleButton:pressed {
                    background-color: #e0352b;
                }
            """)
            self.countdown = 30
            self.timer.start(1000)  # 1 second intervals
            self.update_countdown()
            self.start_signal.emit()
        else:
            self.status_label.setText("Status: Paused")
            self.toggle_button.setText("Start Capturing")
            self.toggle_button.setStyleSheet("""
                QPushButton#toggleButton {
                    background-color: #0071e3;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    padding: 10px 20px;
                    font-size: 14px;
                    font-weight: bold;
                }
                QPushButton#toggleButton:hover {
                    background-color: #0077ed;
                }
                QPushButton#toggleButton:pressed {
                    background-color: #005bb5;
                }
            """)
            self.countdown_label.setText("Next screenshot in: --")
            self.timer.stop()
            self.pause_signal.emit()
    
    def update_countdown(self):
        self.countdown_label.setText(f"Next screenshot in: {self.countdown}s")
        self.countdown -= 1
        if self.countdown < 0:
            self.countdown = 30
    
    def add_log_entry(self, message, timestamp):
        item = QListWidgetItem()
        item.setSizeHint(QSize(self.log_list.width(), 60))
        
        log_widget = LogItem(message, timestamp)
        
        self.log_list.insertItem(0, item)
        self.log_list.setItemWidget(item, log_widget)
        
        # Limit log entries to keep UI clean
        while self.log_list.count() > 10:
            self.log_list.takeItem(self.log_list.count() - 1)
