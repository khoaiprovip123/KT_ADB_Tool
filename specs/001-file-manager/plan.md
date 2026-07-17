# Implementation Plan: FileManager

**Branch**: `001-file-manager` | **Date**: 2026-07-17 | **Spec**: [specs/001-file-manager/spec.md](file:///d:/BT/AndroidTOOL/KT_ADB_Tool/specs/001-file-manager/spec.md)

**Input**: Feature specification from `/specs/001-file-manager/spec.md`

## Summary

Dự án hiện có cấu trúc Electron + React + Vite + TypeScript. FileManager được xây dựng như một component React lớn (`FileManager.tsx`) giao tiếp với main process qua IPC để thực thi các lệnh ADB thông qua `adbkit` (và các file binary adb cục bộ nếu có).

Chúng ta sẽ duy trì kiến trúc IPC hiện có:
- **Renderer**: Gọi các phương thức trên `window.api` (ví dụ `window.api.listDirectory`, `window.api.pushFile`).
- **Preload**: Export các API từ Main sang Renderer.
- **Main**: Đăng ký các bộ xử lý IPC (`ipcMain.handle`) tương ứng để gọi các module ADB cốt lõi.

## Technical Context

**Language/Version**: TypeScript 5.4, React 18.3, Node 20.x, Electron 30.0

**Primary Dependencies**: `adbkit`, `framer-motion`, `lucide-react`, `zustand`

**Storage**: `electron-store` cho cấu hình; các file được lưu trực tiếp trên thiết bị Android qua ADB.

**Testing**: `vitest`

**Target Platform**: Windows (Desktop App) kết nối Android qua cáp USB / Wifi.

**Project Type**: desktop-app

**Performance Goals**: Hiển thị danh sách file (<500 file) trong dưới 1 giây. Upload/download ổn định.

**Constraints**: Mọi thao tác I/O trên Android đều là async qua adb shell/push/pull.

## Project Structure

### Documentation (this feature)

```text
specs/001-file-manager/
├── plan.md              # File này
└── spec.md              # Đặc tả tính năng
```

### Source Code

```text
src/
├── main/
│   ├── index.ts         # Khởi tạo Electron app
│   ├── core/            # ADB core service (adbCore.ts, appService.ts)
│   └── ipc/             # Đăng ký IPC handlers (deviceHandlers.ts)
├── preload/
│   └── index.ts         # Cầu nối IPC (window.api)
└── renderer/
    └── src/
        ├── App.tsx      # Giao diện chính
        ├── components/
        │   └── features/
        │       └── FileManager.tsx  # Component UI FileManager
        └── store/
            └── deviceStore.ts # Quản lý thiết bị kết nối qua Zustand
```

**Structure Decision**: Cấu trúc đơn lẻ (Single project) chuẩn của Electron-Vite template. Tách biệt main process (node) và renderer process (browser).
