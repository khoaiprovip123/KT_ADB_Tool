# Phase 3: Refactor Frontend
Priority: **P1** | Estimate: **5–7 ngày**

## Mục tiêu

Không file component nào > 500 dòng. Pattern giống `AppManager/` (hooks + components).

## 3.1 SystemTweaks.tsx → features/system-tweaks/

**7 category hiện tại:** debloat, display, security, game, animations, controls, multitasking

### Cấu trúc mục tiêu

```
src/renderer/src/features/system-tweaks/
├── index.tsx
├── types.ts
├── hooks/
│   ├── useDebloat.ts
│   ├── useDisplayTweaks.ts
│   ├── useSecurityTweaks.ts
│   ├── useGameTweaks.ts
│   ├── useControlsTweaks.ts
│   └── useMultitaskingTweaks.ts
├── panels/
│   ├── DebloatPanel.tsx
│   ├── DisplayPanel.tsx
│   ├── SecurityPanel.tsx
│   ├── GamePanel.tsx
│   ├── AnimationsPanel.tsx
│   ├── ControlsPanel.tsx
│   └── MultitaskingPanel.tsx
└── components/
    ├── CategoryItem.tsx
    ├── StatCard.tsx
    ├── TweakSwitchRow.tsx
    ├── ActionButton.tsx
    ├── PresetButton.tsx
    └── AnimScaleCard.tsx
```

### Checklist tách (theo thứ tự)

- [x] **Ngày 1-6:** Hoàn thành trích xuất cấu trúc module: `useSystemTweaks`, `DebloatPanel`, `DisplayPanel`, `GenericTweaksPanel`, `index.tsx`
- [x] **Ngày 7:** Xóa `declare const window` local → dùng `preload.d.ts`
- [x] Cập nhật `App.tsx` import (đã dọn dẹp)
- [x] Xóa `components/features/SystemTweaks.tsx`

## 3.2 AdvancedAdb.tsx → features/advanced-adb/

```
src/renderer/src/features/advanced-adb/
├── index.tsx
├── hooks/useAdvancedAdb.ts
├── panels/
│   ├── PropsPanel.tsx
│   ├── SettingsPanel.tsx
│   ├── DumpsysPanel.tsx
│   └── RawShellPanel.tsx
└── components/PresetCommandForm.tsx
```

- [x] Tách 4 panel: DeviceProfile, CommandCatalog, RawShell, History
- [x] Raw shell panel: Tích hợp slide to unlock + confirm modal
- [x] Test: getprop, settings list, dumpsys battery, preset command đều hoạt động bình thường
- [x] Xóa components/features/AdvancedAdb.tsx cũ

## 3.3 UserExperience.tsx → features/xiaomi-experience/

```
src/renderer/src/features/xiaomi-experience/
├── index.tsx
├── hooks/useXiaomiCapabilities.ts
└── components/
    ├── ExperienceCard.tsx
    └── ConfirmRiskModal.tsx
```

- [ ] Tách hook load capabilities
- [ ] Tách confirm modal rủi ro
- [ ] Test toggle + rollback

## 3.4 App.tsx — tab routing

- [ ] Thay chuỗi if/else bằng config array:

```typescript
const TABS = [
  { id: "dashboard", label: "Tổng quan", component: Dashboard },
  { id: "system", label: "Quản lý ứng dụng", component: AppManager },
  // ...
] as const;
```

## Tiêu chí hoàn thành

- [ ] Không file > 500 dòng trong `features/`
- [ ] Mỗi panel test tay trên thiết bị thật
- [ ] Không duplicate `declare const window` trong feature files
