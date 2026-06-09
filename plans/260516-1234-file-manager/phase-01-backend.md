# Phase 01: Backend IPC Service
Status: ✅ Completed
Dependencies: None

## Objective
Mở rộng `adbService.ts` và `ipc/index.ts` để hỗ trợ các thao tác tệp tin cơ bản.

## Requirements
### Functional
- [x] Liệt kê danh sách file/folder trong một đường dẫn (`readdir`).
- [x] Lấy thông tin chi tiết tệp (size, date, permissions).
- [x] Tạo thư mục mới (`mkdir`).
- [x] Xóa file/folder (`rm`).
- [x] Đổi tên/Di chuyển file (`mv`).
- [x] Tải file về PC (`pull`).
- [x] Đẩy file lên thiết bị (`push`).

## Implementation Steps
1. [x] Cập nhật `src/main/core/adbService.ts`: Thêm các hàm `listDirectory`, `deleteFile`, `createDirectory`, `renameFile`, `pushFile`, `pullFile`.
2. [x] Cập nhật `src/main/ipc/index.ts`: Đăng ký các handle IPC mới tương ứng.
3. [x] Cập nhật `src/preload/index.ts` (nếu cần) để expose các API mới ra renderer.

## Files to Create/Modify
- `src/main/core/adbService.ts` - Thêm logic ADBKit.
- `src/main/ipc/index.ts` - Đăng ký IPC handlers.
- `src/preload/index.ts` - Expose API.

## Test Criteria
- [x] Gọi thử `adb:list-directory` qua DevTools Console và nhận về danh sách file.
- [x] Test xóa một file tạm trong `/sdcard/`.

---
Next Phase: [Phase 02: Frontend UI Layout](phase-02-frontend.md)
