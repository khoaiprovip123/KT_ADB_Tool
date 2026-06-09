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

- [ ] Fatal error dialog trong main process
- [ ] Refactor `onDeviceUpdate` / `onLogStream` → return cleanup function
- [ ] Audit các feature chưa dùng `handleAdbError`

## 6.2 Auto-update

- [ ] Thêm `electron-updater` dependency
- [ ] Main process: check update on startup (opt-in từ settings)
- [ ] `Settings/Updates.tsx` gọi check + hiển thị progress
- [ ] Cần GitHub Releases hoặc update server

## 6.3 Performance

- [ ] Lazy load tab lớn:

```typescript
const SystemTweaks = React.lazy(() => import('./features/system-tweaks'));
const AdvancedAdb = React.lazy(() => import('./features/advanced-adb'));
```

- [ ] `react-window` cho bloatware list nếu > 500 items
- [ ] Debounce search trong App Manager / Debloat

## 6.4 Bảo mật bổ sung

- [ ] `executeRawShell` — confirm bắt buộc + audit log
- [ ] Rate limit IPC: max N `runAdbCommand`/giây/device
- [ ] Document rủi ro debloat trong UI (link hoặc tooltip)

## 6.5 E2E test (tuỳ chọn)

- [ ] Playwright + Electron hoặc spectron successor
- [ ] Test smoke: app launch, init ADB, list devices (mock)

## Tiêu chí hoàn thành

- [ ] App không crash im lặng — user thấy lỗi rõ ràng
- [ ] Tab chuyển nhanh hơn (lazy load)
- [ ] Auto-update hoạt động trên bản release
- [ ] Raw shell có confirm + log
