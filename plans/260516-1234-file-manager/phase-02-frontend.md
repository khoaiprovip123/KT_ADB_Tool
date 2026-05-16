# Phase 02: Frontend UI Layout
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Thiết kế giao diện File Manager hiện đại (Glassmorphism) và tích hợp vào thanh điều hướng.

## Requirements
### Functional
- [ ] Giao diện danh sách file (Table hoặc Grid view).
- [ ] Thanh địa chỉ (Address bar) hỗ trợ click để quay lại thư mục cha.
- [ ] Thanh công cụ (Toolbar) với các nút: Back, Forward, Refresh, New Folder, Upload, Delete.
- [ ] Sidebar nhỏ hiển thị các Shortcut (Storage, Camera, Downloads).

## Implementation Steps
1. [ ] Tạo file `src/renderer/src/components/features/FileManager.tsx`.
2. [ ] Thiết kế layout sử dụng Tailwind CSS:
    - Glass container.
    - Header (Address bar + Search).
    - File list (Virtual list nếu cần tối ưu).
    - Footer (Stats: số lượng file, dung lượng).
3. [ ] Cập nhật `src/renderer/src/App.tsx`: Thêm tab "Quản lý tệp tin" vào Sidebar.

## Files to Create/Modify
- `src/renderer/src/components/features/FileManager.tsx` [NEW]
- `src/renderer/src/App.tsx` [MODIFY]

---
Next Phase: [Phase 03: Integration & Logic](phase-03-logic.md)
