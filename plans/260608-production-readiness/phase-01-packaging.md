# Phase 1: Đóng gói & Documentation
Priority: **P0** | Estimate: **2–3 ngày**

## Mục tiêu

Tạo installer Windows hoạt động trên máy không cài Node.js.

## Checklist

### Bước 1 — electron-builder config

- [x] Thêm block `"build"` vào `package.json` (xem snippet bên dưới)
- [x] Tạo `resources/icon.png` (dùng cho electron-builder)
- [x] Đảm bảo `xiaomi_bloatware_removal.json` được bundle

**Snippet `package.json` → `"build"`:**

```json
"build": {
  "appId": "com.khoaiprovip.kt-adb-tool",
  "productName": "KT ADB Tool Pro",
  "directories": {
    "output": "dist"
  },
  "files": [
    "out/**/*",
    "package.json"
  ],
  "extraResources": [
    {
      "from": "resources/bin",
      "to": "bin",
      "filter": ["**/*"]
    },
    {
      "from": "xiaomi_bloatware_removal.json",
      "to": "."
    }
  ],
  "win": {
    "target": ["nsis"],
    "icon": "resources/icon.png",
    "signAndEditExecutable": false
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true
  }
}
```

### Bước 2 — Verify đường dẫn khi packaged

Logic hiện có trong `initAdb` / `deviceService`:

```typescript
app.isPackaged
  ? path.join(process.resourcesPath, "bin")
  : path.join(__dirname, "../../resources/bin")
```

- [x] Xác nhận `adb.exe` nằm trong `resources/bin/` (dev)
- [x] Xác nhận scrcpy path: `resources/bin/scrcpy/scrcpy.exe`
- [x] Sau `build:unpack`, kiểm tra `dist/win-unpacked/resources/bin/`

### Bước 3 — Build test

- [x] `npm run build:unpack` thành công (cần `signAndEditExecutable: false` trên Windows không có quyền symlink)
- [x] Chạy `.exe` từ `dist/win-unpacked/`
- [x] Test: kết nối thiết bị USB
- [x] Test: mở scrcpy
- [x] Test: list app / debloat 1 package an toàn
- [ ] `npm run build:win` → installer `.exe` cài được (tuỳ chọn — unpack đã đủ dev)

### Bước 4 — Cập nhật README

- [x] Version khớp `package.json` (hiện: `2.3.0-PRO-MAX`)
- [x] Yêu cầu hệ thống: Windows 10+, USB debugging
- [x] Hướng dẫn cài driver (nếu cần)
- [ ] Screenshot 3 tab: Dashboard, App Manager, File Manager
- [x] Mục Troubleshooting:
  - Chưa kết nối thiết bị
  - Nút Fix Connection / reset ADB server
  - Unauthorized device

### Bước 5 — Dọn resources/bin (tuỳ chọn)

Hiện có 2 bản scrcpy:
- `resources/bin/scrcpy/`
- `resources/bin/scrcpy-win64-v2.4/`

- [x] Xác định bản đang dùng (`deviceService` → `scrcpy/scrcpy.exe`)
- [x] Xóa bản không dùng (`scrcpy-win64-v2.4`) để giảm kích thước installer

## Ghi chú Windows — winCodeSign symlink

Nếu gặp lỗi `Cannot create symbolic link : A required privilege is not held by the client` khi build:

- Đã thêm `"signAndEditExecutable": false` trong `package.json` → build dev/local OK
- Hoặc bật **Developer Mode** (Settings → For developers)
- Hoặc chạy terminal **Administrator** khi cần code signing

## Tiêu chí hoàn thành

- [x] App chạy từ `dist/win-unpacked/KT ADB Tool Pro.exe` (đã verify)
- [x] ADB + scrcpy bundle trong `dist/win-unpacked/resources/bin/`
- [x] README đồng bộ version
