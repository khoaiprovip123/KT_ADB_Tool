# KT ADB Tool Pro
[![CI](https://github.com/khoaiprovip123/KT_ADB_Tool/actions/workflows/ci.yml/badge.svg)](https://github.com/khoaiprovip123/KT_ADB_Tool/actions/workflows/ci.yml)

**KT ADB Tool Pro** là giải pháp quản lý thiết bị Android qua ADB, xây dựng trên Electron và ADBKit, với giao diện hiện đại (Glassmorphism).

## Yêu cầu hệ thống

- **Windows 10/11** (64-bit)
- **USB Debugging** đã bật trên thiết bị Android
- Driver USB phù hợp (Google USB Driver hoặc driver hãng máy)
- Không cần cài Node.js khi dùng bản cài đặt (installer)

## Tính năng nổi bật

### Quản lý ứng dụng (App Manager)
- Phân loại app hệ thống / người dùng / đã tắt
- Dọn rác (bloatware) với database Xiaomi và các hãng khác
- Thao tác hàng loạt: gỡ, vô hiệu hóa, bật lại, khôi phục
- Cài đặt APK kéo thả

### Quản lý tệp tin (File Manager)
- Duyệt bộ nhớ trong và thẻ nhớ ngoài
- Xem trước ảnh, push/pull, đổi tên, xóa

### Bảo mật & hệ thống
- Tinh chỉnh hiệu năng, pin, DPI, độ phân giải
- Blacklist bảo vệ package cốt lõi khi debloat
- Tùy biến trải nghiệm Xiaomi (MIUI/HyperOS)

### Giao diện
- Glassmorphism, phản hồi realtime qua ADB log stream
- Scrcpy mirroring tích hợp sẵn

## Công nghệ

- **Frontend:** React, Tailwind CSS, Framer Motion, Zustand
- **Backend:** Electron, Node.js, ADBKit
- **Build:** electron-vite, electron-builder

## Phát triển

```bash
npm install
npm run dev          # Chế độ phát triển
npm run typecheck    # Kiểm tra TypeScript
npm test             # Unit tests
npm run build        # Build (cần typecheck pass)
npm run build:unpack # Build + thư mục cài đặt (test nhanh)
npm run build:win    # Tạo installer Windows (.exe)
```

> **Lưu ý Windows:** Nếu `electron-builder` lỗi symlink khi extract winCodeSign, cấu hình `signAndEditExecutable: false` trong `package.json` đã được bật sẵn. Để ký code chính thức, chạy terminal **Administrator** hoặc bật Developer Mode.

## Đóng gói

Bản release bundle sẵn:
- **ADB platform-tools** (`resources/bin/`)
- **scrcpy** (`resources/bin/scrcpy/`)
- **Database bloatware** (`xiaomi_bloatware_removal.json`)

Sau khi cài, binary nằm tại `resources/bin` cạnh file app (không cần cài ADB riêng).

## Troubleshooting

### Chưa kết nối thiết bị
1. Kiểm tra cáp USB và chọn chế độ **File transfer (MTP)**
2. Bật **USB debugging** trong Developer options
3. Chấp nhận popup **Allow USB debugging** trên điện thoại
4. Nhấn nút thiết bị trên header → **Connection Manager**

### Unauthorized / offline
- Rút cắm lại cáp, revoke USB debugging authorizations trên máy, kết nối lại
- Chạy **Fix Connection** (reset ADB server) trong app

### ADB không nhận máy
- Cài [Google USB Driver](https://developer.android.com/studio/run/win-usb) hoặc driver OEM
- Thử cổng USB khác (ưu tiên USB 2.0 trực tiếp trên mainboard)

### Scrcpy không mở
- Đảm bảo thiết bị ở trạng thái `device` (không `unauthorized`)
- Tắt scrcpy instance cũ nếu còn chạy nền

## Kế hoạch phát triển

Roadmap đang được cập nhật. Xem [GitHub Issues](https://github.com/khoaiprovip123/KT_ADB_Tool/issues) cho danh sách tính năng sắp tới.

## 🚀 Hệ thống Tự động Cập nhật & CI/CD Build Setup (Python Component)

Ứng dụng tích hợp hệ thống quản lý mã nguồn, tự động build bộ cài đặt phân phối chuẩn Windows (`Setup.exe`) và cập nhật nóng tự động.

### 🛠️ Hướng Dẫn Vận Hành Cho Lập Trình Viên

Khi bổ sung tính năng mới, chỉ cần chạy chuỗi lệnh Git chuẩn sau tại máy Local:

```bash
# 1. Lưu trữ mã nguồn mới
git add .
git commit -m "feat: upgrade core features"

# 2. Đóng Tag phiên bản mới (Hệ thống CI/CD dựa trên Tag này để định danh bộ cài)
git tag -a v0.0.2 -m "Build release version v0.0.2"

# 3. Đẩy dữ liệu lên GitHub để kích hoạt máy ảo tự động làm việc
git push origin main --tags
```

### 📦 Hướng Dẫn Cài Đặt Cho Người Dùng Cuối
1. Truy cập mục **Releases** của dự án trên GitHub, tải file duy nhất tên `Application_Setup.exe`.
2. Khởi chạy file Setup, nhấn Next để phần mềm tự động cài đặt vào hệ thống.
3. Từ các lần sau, mỗi khi nhà phát triển đẩy phiên bản mới lên GitHub, người dùng chỉ cần mở phần mềm lên; hệ thống sẽ tự động phát hiện, tải bản cập nhật mới và cài đè ngầm mà không cần thực hiện lại các bước trên.

---
*Phát triển bởi **khoaiprovip123**.*

