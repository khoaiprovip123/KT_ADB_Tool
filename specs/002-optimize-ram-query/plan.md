# Implementation Plan: Optimize RAM Query

**Branch**: `002-optimize-ram-query` | **Date**: 2026-07-17 | **Spec**: [specs/002-optimize-ram-query/spec.md](file:///d:/BT/AndroidTOOL/KT_ADB_Tool/specs/002-optimize-ram-query/spec.md)

**Input**: Feature specification from `/specs/002-optimize-ram-query/spec.md`

## Summary

Thay thế cách truy vấn RAM bằng lệnh `dumpsys meminfo` (chậm) bằng cách đọc trực tiếp `/proc/meminfo` (nhanh) qua ADB Shell. Điều chỉnh Regex parse dữ liệu và đảm bảo tính tương thích ngược cho unit test hiện tại.

## Technical Context

**Language/Version**: TypeScript 5.4, Node 20.x

**Primary Dependencies**: Không có dependency mới.

**Storage**: N/A

**Testing**: `vitest`

**Target Platform**: Windows (Desktop App), chạy adb shell commands trên Android.

**Project Type**: desktop-app

**Performance Goals**: Thời gian thực thi phần đọc RAM của hàm `getDeviceInfo` giảm xuống dưới 200ms.

## Project Structure

### Documentation (this feature)

```text
specs/002-optimize-ram-query/
├── plan.md              # File này
└── spec.md              # Đặc tả tính năng
```

### Source Code

- **Modify**: `src/main/core/deviceInfoService.ts` - sửa logic trích xuất thông số RAM.
- **Modify**: `tests/utils/deviceInfoService.test.ts` - cập nhật mock và viết thêm test case cho định dạng `/proc/meminfo`.

## Technical Decisions

1. **Lệnh ADB sử dụng**: Thay `dumpsys meminfo` bằng `cat /proc/meminfo`.
2. **Regex parse**:
   - `MemTotal:\s+(\d+)\s+kB` để lấy RAM tổng.
   - `MemAvailable:\s+(\d+)\s+kB` để lấy RAM khả dụng.
   - `MemFree:\s+(\d+)\s+kB` làm fallback nếu không tìm thấy `MemAvailable`.
3. **Quy đổi**: Chia cho 1024 để đổi từ KB sang MB (tương tự như chia 1024 từ giá trị K của dumpsys meminfo).
