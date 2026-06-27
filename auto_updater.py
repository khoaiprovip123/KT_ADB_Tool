import os
import sys
import logging
import requests
import subprocess
from version_config import CURRENT_VERSION

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(levelname)s] - %(message)s')

# Cấu hình thông tin kho chứa GitHub
REPO_OWNER = "khoaiprovip123"
REPO_NAME = "KT_ADB_Tool"
SETUP_FILE_NAME = "Application_Setup.exe"


def _normalize_version(v: str) -> str:
    """Loại bỏ tiền tố 'v' và hậu tố '-PRO-MAX' để so sánh semantic version."""
    v = v.strip().lstrip("v")
    parts = v.split("-")[0].split(".")
    return ".".join(parts)


def _is_newer(latest: str, current: str) -> bool:
    """So sánh 2 semantic version, trả True nếu latest > current."""
    try:
        from packaging.version import Version
        return Version(_normalize_version(latest)) > Version(_normalize_version(current))
    except ImportError:
        # Fallback: so sánh tuple số
        l = tuple(int(x) for x in _normalize_version(latest).split("."))
        c = tuple(int(x) for x in _normalize_version(current).split("."))
        return l > c
    except Exception:
        return False


def check_and_run_update():
    """Kiểm tra API GitHub Releases, nếu có bản mới thì tải về và cài đặt ngầm."""
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases/latest"
    headers = {"Accept": "application/vnd.github+json"}

    try:
        logging.info(f"Đang check update. Phiên bản hiện tại: {CURRENT_VERSION}")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        release_data = response.json()
        latest_version = release_data.get("tag_name", "v0.0.0")

        if _is_newer(latest_version, CURRENT_VERSION):
            logging.info(f"Phát hiện phiên bản mới: {latest_version}. Tiến hành tải bộ cài đặt...")

            assets = release_data.get("assets", [])
            download_url = None
            for asset in assets:
                if asset["name"] == SETUP_FILE_NAME:
                    download_url = asset["browser_download_url"]
                    break

            if not download_url:
                logging.error("Không tìm thấy tệp bộ cài đặt Setup.exe trên bản Release mới.")
                return False

            # Đường dẫn lưu file Setup tạm thời
            temp_dir = os.environ.get("TEMP", "C:\\Temp")
            target_setup_path = os.path.join(temp_dir, SETUP_FILE_NAME)

            # Tải tệp tin theo luồng chunk tránh tràn RAM
            with requests.get(download_url, stream=True, timeout=60) as r:
                r.raise_for_status()
                with open(target_setup_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)

            logging.info("Tải thành công. Kích hoạt cài đặt ngầm đè phiên bản...")

            # Tham số chạy ngầm của Inno Setup: Cài im lặng, tự đóng app cũ, không restart máy
            install_args = [target_setup_path, "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/CLOSEAPPLICATIONS"]
            subprocess.Popen(install_args, shell=True, creationflags=subprocess.CREATE_NEW_CONSOLE)

            # Thoát app hiện tại ngay lập tức để giải phóng file lock
            sys.exit(0)
        else:
            logging.info("Ứng dụng đang chạy ở phiên bản mới nhất.")
            return False

    except Exception as e:
        logging.error(f"Lỗi hệ thống cập nhật tự động: {str(e)}")
        return False
