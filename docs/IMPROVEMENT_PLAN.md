# KT ADB Tool Pro — Kế Hoạch Cải Thiện Toàn Diện

> Tài liệu chi tiết implement cho mỗi phase. Đánh dấu `[x]` khi hoàn thành.

---

## Phase 1: Consolidate Validation + Define Types (1-2 ngày)

### 1.1 Shared Validation Module
- [ ] Tạo `src/shared/validation/index.ts` — tất cả regex + validate functions
- [ ] Refactor `src/main/ipc/validate.ts` — import từ shared, giữ assert* wrappers
- [ ] Refactor `src/main/core/adbSafety.ts` — import từ shared
- [ ] Refactor `src/renderer/src/utils/validation.ts` — re-export từ shared

### 1.2 Define TypeScript Types
- [ ] Tạo `src/shared/types/device.ts` — AdbDevice, DeviceInfo, StorageStats, AppInfo, FileInfo
- [ ] Cập nhật `src/shared/types/index.ts` — export tất cả
- [ ] Sửa `deviceStore.ts` — `devices: AdbDevice[]`, thêm `deviceInfo`, `refreshDeviceInfo()`
- [ ] Sửa `preload.d.ts` — thay `any` bằng types cụ thể
- [ ] Sửa Dashboard, FileManager, AdvancedAdb — useState types

**Verify:** `npm run typecheck && npm test && npm run build`

---

## Phase 2: Split Components + Extract Data (2-3 ngày)

### 2.1 Tách ExperienceCenter.tsx (1,929 lines → ~11 files)
```
ExperienceCenter/
├── index.tsx                    (~250 lines)
├── hooks/useExperienceData.ts   (~100 lines)
├── hooks/useDebloatActions.ts   (~80 lines)
├── components/ActionRow.tsx     (~120 lines)
├── components/MetricTile.tsx    (~30 lines)
├── components/ConfirmDialog.tsx (~60 lines)
├── components/DisplayControlPanel.tsx (~150 lines)
├── components/DebloatWorkspace.tsx (~200 lines)
├── sections/OverviewSection.tsx (~200 lines)
├── sections/DisplaySection.tsx  (~200 lines)
└── sections/DebloatSection.tsx  (~250 lines)
```

### 2.2 Tách SystemTweaks.tsx (2,493 lines → ~13 files)
```
SystemTweaks/
├── index.tsx                    (~200 lines)
├── hooks/useBloatware.ts        (~100 lines)
├── hooks/useSystemTweaks.ts     (~80 lines)
├── hooks/useDisplaySettings.ts  (~80 lines)
├── components/BloatwareRow.tsx  (~60 lines)
├── components/TweakRow.tsx      (~60 lines)
├── sections/DebloatSection.tsx  (~300 lines)
├── sections/DisplaySection.tsx  (~200 lines)
├── sections/SecuritySection.tsx (~100 lines)
├── sections/GameSection.tsx     (~100 lines)
├── sections/AnimationsSection.tsx (~100 lines)
├── sections/ControlsSection.tsx (~100 lines)
└── sections/MultitaskingSection.tsx (~100 lines)
```

### 2.3 Tách AdvancedAdb.tsx (1,727 lines → ~10 files)
```
AdvancedAdb/
├── index.tsx                    (~200 lines)
├── hooks/useDeviceProfile.ts    (~80 lines)
├── hooks/useCommandCatalog.ts   (~100 lines)
├── hooks/useShellTerminal.ts    (~80 lines)
├── components/ProfileExplorer.tsx (~200 lines)
├── components/CommandCard.tsx   (~80 lines)
├── components/ShellTerminal.tsx (~150 lines)
├── sections/ProfileSection.tsx  (~250 lines)
├── sections/CatalogSection.tsx  (~200 lines)
└── sections/ShellSection.tsx    (~150 lines)
```

### 2.4 Extract Hardcoded Data
- [ ] Tạo `src/main/core/data/bloatware_fallback.json` — từ BUILTIN_BLOATWARE_DB
- [ ] Tạo `src/main/core/data/xiaomi_experience.json` — từ XIAOMI_EXPERIENCE_ITEMS
- [ ] Sửa `systemTweaksService.ts` — xóa hardcoded, import JSON
- [ ] Sửa `xiaomiExperienceRegistry.ts` — xóa hardcoded, import JSON

**Verify:** `npm run typecheck && npm test && npm run build`

---

## Phase 3: Tests + Unified Toast (1 ngày)

### 3.1 Renderer Tests
- [ ] `tests/renderer/stores/deviceStore.test.ts` — auto-select, keep/fallback activeDevice, log limit
- [ ] `tests/renderer/stores/toastStore.test.ts` — add, auto-remove, manual remove
- [ ] `tests/renderer/utils/errorHandler.test.ts` — error mapping, Vietnamese messages

### 3.2 Unified Toast
- [ ] `AdvancedAdb.tsx` — xóa custom useState toast, dùng `toast` từ store
- [ ] `UserExperience.tsx` — tương tự nếu có custom toast

**Verify:** `npm test` (tất cả pass)

---

## Phase 4: Performance (1-2 ngày)

### 4.1 Virtual Scrolling
- [ ] `AppManager/index.tsx` — `react-window` FixedSizeList cho package list
- [ ] `LogTerminal.tsx` — VariableSizeList cho log entries

### 4.2 Auto-refresh Device Info
- [ ] `deviceStore.ts` — thêm `refreshDeviceInfo()` method
- [ ] Gọi `refreshDeviceInfo()` sau mỗi action thành công (debloat, tweak, DPI, ...)
- [ ] Auto-refresh khi `activeDevice` thay đổi trong App.tsx

**Verify:** `npm run build` + test manual

---

## Phase 5: Multi-device + CI/CD (1 ngày)

### 5.1 Multi-device Auto-switch
- [ ] `deviceStore.ts` — auto-switch khi device mới kết nối
- [ ] Toast notification khi có device mới

### 5.2 CI Workflow
- [ ] `.github/workflows/ci.yml` — typecheck + lint + test + build trên Windows

---

## Bonus: Quick Wins

- [ ] `.nvmrc` — lock Node 20
- [ ] `package.json` — thêm `"engines": { "node": ">=18.0.0" }`
- [ ] `husky` + `lint-staged` — auto lint/format khi commit
- [ ] `CHANGELOG.md` — track version history
- [ ] `CONTRIBUTING.md` — hướng dẫn đóng góp

---

## Checklist tổng hợp

| Phase | Tasks | Effort | Status |
|---|---|---|---|
| 1. Validation + Types | 9 tasks | 1-2 ngày | [ ] |
| 2. Split Components | 28 files tạo mới | 2-3 ngày | [ ] |
| 3. Tests + Toast | 5 tasks | 1 ngày | [ ] |
| 4. Performance | 5 tasks | 1-2 ngày | [ ] |
| 5. Multi-device + CI | 3 tasks | 1 ngày | [ ] |
| Bonus | 5 tasks | 0.5 ngày | [ ] |
