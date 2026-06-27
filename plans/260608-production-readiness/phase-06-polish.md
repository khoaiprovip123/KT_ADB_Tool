# Phase 6: Production Polish
Priority: **P2** | Estimate: **1–2 tuần**

## Mục tiêu

Trải nghiệm production: error handling, performance, auto-update.

## 6.1 Error handling

| Vấn đề | File | Giải pháp |
|--------|------|-----------|
| uncaughtException chỉ log | `src/main/index.ts` | Gửi IPC `app:fatal-error` + dialog |
| Log listener ghi đè | `preload/index.ts` | Pattern subscribe/unsubscribe như `onBatchProgress` |
| Lỗi ADB không thống nhất | `errorHandler.ts` | Mọi feature dùng `handleAdbError` |

- [x] Fatal error dialog trong main process
- [x] Refactor `onDeviceUpdate` / `onLogStream` → return cleanup function
- [x] Audit các feature chưa dùng `handleAdbError`

## 6.2 Auto-update

- [x] Tối ưu và chạy ngầm auto-updater tuỳ chỉnh qua GitHub API
- [x] Main process: check update on startup
- [x] `Settings/Updates.tsx` gọi check + hiển thị progress
- [x] Cài đặt GitHub Releases làm update server

## 6.3 Performance

- [x] Lazy load tab lớn qua React.lazy & React.Suspense
- [x] `react-window` cho bloatware list nếu > 500 items (đã có sẵn trong code)
- [x] Debounce search trong App Manager / Debloat (đã có sẵn trong code)

## 6.4 Bảo mật bổ sung

- [x] `executeRawShell` — confirm bắt buộc + audit log
- [ ] Rate limit IPC: max N `runAdbCommand`/giây/device
- [ ] Document rủi ro debloat trong UI (link hoặc tooltip)

## 6.5 E2E test (tuỳ chọn)

- [ ] Playwright + Electron hoặc spectron successor
- [ ] Test smoke: app launch, init ADB, list devices (mock)

## Tiêu chí hoàn thành

- [x] App không crash im lặng — user thấy lỗi rõ ràng
- [x] Tab chuyển nhanh hơn (lazy load)
- [x] Auto-update hoạt động trên bản release
- [x] Raw shell có confirm + log
