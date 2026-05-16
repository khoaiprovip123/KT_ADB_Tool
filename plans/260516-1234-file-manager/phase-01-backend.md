# Phase 01: Backend IPC Service
Status: ⬜ Pending
Dependencies: None

## Objective
Mở rộng `adbService.ts` và `ipc/index.ts` để hỗ trợ các thao tác tệp tin cơ bản.

## Requirements
### Functional
- [ ] Liệt kê danh sách file/folder trong một đường dẫn (`readdir`).
- [ ] Lấy thông tin chi tiết tệp (size, date, permissions).
- [ ] Tạo thư mục mới (`mkdir`).
- [ ] Xóa file/folder (`rm`).
- [ ] Đổi tên/Di chuyển file (`mv`).
- [ ] Tải file về PC (`pull`).
- [ ] Đẩy file lên thiết bị (`push`).

## Implementation Steps
1. [ ] Cập nhật `src/main/core/adbService.ts`: Thêm các hàm `listDirectory`, `deleteFile`, `createDirectory`, `renameFile`, `pushFile`, `pullFile`.
2. [ ] Cập nhật `src/main/ipc/index.ts`: Đăng ký các handle IPC mới tương ứng.
3. [ ] Cập nhật `src/preload/index.ts` (nếu cần) để expose các API mới ra renderer.

## Files to Create/Modify
- `src/main/core/adbService.ts` - Thêm logic ADBKit.
- `src/main/ipc/index.ts` - Đăng ký IPC handlers.
- `src/preload/index.ts` - Expose API.

## Test Criteria
- [ ] Gọi thử `adb:list-directory` qua DevTools Console và nhận về danh sách file.
- [ ] Test xóa một file tạm trong `/sdcard/`.

---
Next Phase: [Phase 02: Frontend UI Layout](phase-02-frontend.md)
