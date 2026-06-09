import sys
import logging
from auto_updater import check_and_run_update

def main():
    logging.info("Starting application...")
    
    # Tự động cập nhật ngầm trước khi khởi động ứng dụng chính
    check_and_run_update()
    
    # Logic ứng dụng chính...
    logging.info("Running main application features...")

if __name__ == "__main__":
    main()
