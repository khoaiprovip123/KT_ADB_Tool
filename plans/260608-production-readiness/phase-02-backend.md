# Phase 2: Refactor Backend
Priority: **P1** | Estimate: **4–5 ngày** | Status: ✅ **Hoàn thành**

## Mục tiêu

`adbService.ts` chỉ còn core ADB client; xóa toàn bộ code duplicate.

## Kết quả đạt được

| File | Dòng | Vai trò |
|------|------|---------|
| `adbCore.ts` | ~149 | Core: init, devices, runAdbCommand, execAdb |
| `deviceInfoService.ts` | ~497 | getDeviceInfo (tách riêng vì lớn) |
| `adbService.ts` | 4 | Re-export deprecated → adbCore |
| `ipc/validate.ts` | mới | assertValidDeviceId / isValidDeviceId |

**Đã xóa ~1750 dòng duplicate** khỏi `adbService.ts` (app, file, scrcpy, debloat, tweaks...).

## Checklist theo ngày

### Ngày 1 — Inventory

- [x] Chạy: `grep "^export" src/main/core/adbService.ts`
- [x] Chạy: `grep -r "from.*adbService" src/main`
- [x] Ghi lại hàm nào **không còn được import** → candidate xóa

### Ngày 2 — Tạo adbCore.ts

- [x] Tạo `src/main/core/adbCore.ts` (copy phần core)
- [x] `adbService.ts` tạm: `export * from './adbCore'`
- [x] `npm run typecheck` + `npm test`

### Ngày 3 — Di chuyển getDeviceInfo

- [x] Tách `getDeviceInfo` → `deviceInfoService.ts`, re-export qua `deviceService.ts`
- [x] Cập nhật `deviceHandlers.ts` import từ `deviceService` + `adbCore`
- [ ] Test: tab Dashboard hiện đúng model/storage (test tay)

### Ngày 4 — Xóa duplicate (từng block)

1. [x] File ops block (đã có `fileService`)
2. [x] App ops block (đã có `appService`)
3. [x] Scrcpy/connection block (đã có `deviceService`)
4. [x] Debloat/tweaks/DPI block (đã có `systemTweaksService`)

- [x] `npm run typecheck`
- [x] `npm test`

### Ngày 5 — Dọn import + IPC validation

- [x] Tất cả service import từ `adbCore.ts`
- [x] `adbService.ts` chỉ re-export (backward compat)
- [x] Tạo `src/main/ipc/validate.ts`
- [x] Áp dụng cho: `xiaomiExperienceHandlers`, `advancedAdbHandlers`, `fileHandlers`, `deviceHandlers`

## Tiêu chí hoàn thành

- [x] `adbCore.ts` < 400 dòng (~149)
- [x] Không hàm export trùng giữa 2 file
- [x] typecheck + test pass
- [ ] Test thủ công full flow: connect → apps → files → debloat → xiaomi toggle
