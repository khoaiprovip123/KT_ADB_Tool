# Phase 2 — Chi tiết Implement: Split Components

## Pattern chung

Mỗi component lớn tách theo cấu trúc:
```
ComponentName/
├── index.tsx         (layout, import sections)
├── hooks/            (state + API calls)
├── components/       (UI sub-components)
└── sections/         (content theo tab/category)
```

**Steps:** Extract hooks → Extract sub-components → Extract sections → Update imports → Xóa file cũ

---

## 2.1 ExperienceCenter.tsx → 11 files

### hooks/useExperienceData.ts
Load capabilities, tweaks, tweakStatus, bloatList. Dùng `Promise.all` cho parallel fetch.

### hooks/useDebloatActions.ts
`handleSingle(pkg, action, preferDisable)` + `handleBatch(pkgs, action)` với `onBatchProgress`.

### components/ActionRow.tsx
Props: `title, description, risk, status, currentValue, busy, onToggle, onRollback`

### components/ConfirmDialog.tsx
Props: `title, message, risk, confirmLabel, onConfirm, onCancel`

### sections/
- OverviewSection — metrics + recommended actions
- DisplaySection — DPI/resolution/animation controls
- DebloatSection — search + filter + batch actions

---

## 2.2 SystemTweaks.tsx → 13 files

### hooks/
- `useBloatware.ts` — loadBloatware, debloatPackage, batchDebloat
- `useSystemTweaks.ts` — loadTweaks, applyTweak
- `useDisplaySettings.ts` — DPI, resolution, animation

### components/
- `BloatwareRow.tsx` — item với status badge + actions
- `TweakRow.tsx` — toggle với risk indicator

### sections/
- DebloatSection, DisplaySection, SecuritySection, GameSection, AnimationsSection, ControlsSection, MultitaskingSection

---

## 2.3 AdvancedAdb.tsx → 10 files

### hooks/
- `useDeviceProfile.ts` — profile, props, settings
- `useCommandCatalog.ts` — commands, execute preset
- `useShellTerminal.ts` — shell input, history, execute raw

### components/
- `ProfileExplorer.tsx` — searchable key-value table
- `CommandCard.tsx` — command card với params + execute
- `ShellTerminal.tsx` — input + output terminal

### sections/
- ProfileSection, CatalogSection, ShellSection

---

## 2.4 Extract Hardcoded Data

### bloatware_fallback.json
Chuyển `BUILTIN_BLOATWARE_DB` (~150 entries) từ `systemTweaksService.ts` sang JSON.

### xiaomi_experience.json
Chuyển `XIAOMI_EXPERIENCE_ITEMS` (~30 items) từ `xiaomiExperienceRegistry.ts` sang JSON.

### Updated imports:
```typescript
import fallbackData from "./data/bloatware_fallback.json";
import experienceData from "./data/xiaomi_experience.json";
```
