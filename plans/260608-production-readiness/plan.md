# Plan: Production Readiness & Refactor
Created: 2026-06-08
Status: 🟡 In Progress
Owner: khoaiprovip123

## Mục tiêu

Đưa **KT ADB Tool** từ trạng thái “feature-rich nhưng khó build/bảo trì” lên **production-ready**:

- Build pass (`typecheck` + `build:win`)
- Backend gọn, không duplicate code
- Frontend component < 500 dòng/file
- CI chạy trên mỗi PR
- README & version đồng bộ

## Hiện trạng (baseline 2026-06-08)

| Hạng mục | Trạng thái |
|----------|------------|
| `npm test` | ✅ 33/33 pass |
| `npm run typecheck` | ❌ Lỗi `usedFallback` tại `UserExperience.tsx` |
| `npm run build` | ❌ Block bởi typecheck |
| `electron-builder` config | ❌ Chưa có trong `package.json` |
| CI (GitHub Actions) | ❌ Chưa có |
| `adbService.ts` | ~1900 dòng, chứa code trùng với các service khác |
| `SystemTweaks.tsx` | ~2344 dòng |
| File lớn nhất frontend | `SystemTweaks.tsx`, `AdvancedAdb.tsx`, `UserExperience.tsx` |

## Kiến trúc hiện tại vs mục tiêu

```
HIỆN TẠI                          MỤC TIÊU
─────────                          ────────
adbService.ts (god file)    →      adbCore.ts (~300 dòng)
  ├─ init, runCommand                ├─ adbState, initAdb
  ├─ getPackages (DUPLICATE)         ├─ getDevices, watchDevices
  ├─ runScrcpy (DUPLICATE)           ├─ runAdbCommand, execAdb
  ├─ debloat (DUPLICATE)             └─ (không còn business logic)
  └─ file ops (DUPLICATE)

appService.ts        (giữ)          appService.ts
deviceService.ts     (giữ)          deviceService.ts + getDeviceInfo
fileService.ts       (giữ)          fileService.ts
systemTweaksService  (giữ)          systemTweaksService.ts

SystemTweaks.tsx (1 file)  →       features/system-tweaks/
                                     ├─ panels/*.tsx
                                     ├─ hooks/*.ts
                                     └─ components/*.tsx
```

## Roadmap

| Phase | Tên | Ưu tiên | Thời gian | File chi tiết |
|-------|-----|---------|-----------|---------------|
| 0 | Hotfix build | P0 | 0.5–1 ngày | [phase-00-hotfix.md](./phase-00-hotfix.md) |
| 1 | Đóng gói & docs | P0 | 2–3 ngày | [phase-01-packaging.md](./phase-01-packaging.md) |
| 2 | Refactor backend | P1 | 4–5 ngày | [phase-02-backend.md](./phase-02-backend.md) |
| 3 | Refactor frontend | P1 | 5–7 ngày | [phase-03-frontend.md](./phase-03-frontend.md) |
| 4 | Type system | P1 | 3–5 ngày | [phase-04-types.md](./phase-04-types.md) |
| 5 | Test & CI | P1 | 4–5 ngày | [phase-05-ci.md](./phase-05-ci.md) |
| 6 | Production polish | P2 | 1–2 tuần | [phase-06-polish.md](./phase-06-polish.md) |

## Tiến độ tổng

| Phase | Status | Progress |
|-------|--------|----------|
| 00 Hotfix | ✅ Hoàn thành | 100% |
| 01 Packaging | ✅ Hoàn thành | 100% |
| 02 Backend | ✅ Hoàn thành | 100% |
| 03 Frontend | 🔄 Đang làm | 33% |
| 04 Types | ⬜ Chưa bắt đầu | 0% |
| 05 CI | ✅ Hoàn thành | 100% |
| 06 Polish | ✅ Hoàn thành | 100% |

**Cập nhật status:** đổi ⬜ → 🔄 (đang làm) → ✅ (xong)

## Bắt đầu từ đâu?

**Tuần 1 — làm theo thứ tự:**

1. Phase 0 → unblock build
2. Phase 1 → có installer Windows test được
3. Phase 2 (ngày 1–2) → inventory + xóa duplicate đầu tiên trong `adbService`
4. Phase 5 (song song) → setup CI cơ bản sau Phase 0

**Không nên** refactor UI (Phase 3) trước khi Phase 0 + 2 xong — dễ conflict và khó trace lỗi.

## Lệnh thường dùng

```bash
npm run typecheck    # Kiểm tra TypeScript
npm test             # Unit test (vitest)
npm run dev          # Chạy dev
npm run build        # Build (cần typecheck pass)
npm run build:unpack # Build + electron-builder --dir (test nhanh)
npm run build:win    # Build installer Windows
```

## Rủi ro chính

| Rủi ro | Cách giảm thiểu |
|--------|-----------------|
| Xóa code `adbService` gây hỏng tính năng | Xóa từng block, test tay sau mỗi block; dùng branch riêng |
| Refactor UI regression | Tách từng panel, không đổi IPC API |
| Installer thiếu ADB/scrcpy | `extraResources` + test trên máy không có Node |
| Debloat brick thiết bị | Test trên máy phụ; giữ blacklist |

## Definition of Done

### MVP (sau Phase 0 + 1)
- [ ] `npm run typecheck` pass
- [ ] `npm run build:win` tạo installer OK
- [ ] App chạy trên máy sạch, ADB kết nối được
- [ ] README version khớp `package.json`

### Maintainable (sau Phase 2 + 3 + 5)
- [ ] `adbCore.ts` < 400 dòng, không duplicate export
- [ ] Không component nào > 500 dòng
- [x] CI xanh trên PR
- [x] ≥ 50 unit tests

### Product-grade (sau Phase 6)
- [x] Auto-update hoạt động
- [x] Lazy load tab
- [x] Error UX + audit log lệnh nguy hiểm

---

*Plan được tạo từ đánh giá codebase ngày 2026-06-08.*
