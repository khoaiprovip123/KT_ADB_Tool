# Phase 4: Type System
Priority: **P1** | Estimate: **3–5 ngày** | Có thể song song Phase 2–3

## Mục tiêu

Bỏ `any` ở boundary quan trọng (IPC, store, device list).

## Cấu trúc shared types

```
src/shared/types/
├── device.ts
├── app.ts
├── ipc.ts
├── xiaomi.ts
└── index.ts
```

## Checklist

### device.ts

```typescript
export interface AdbDevice {
  id: string;
  type: string;
  model?: string;
  product?: string;
}

export interface StorageStats {
  total: number;
  used: number;
  free: number;
  percentage: number;
}

export interface AdbCommandResult {
  success: boolean;
  output: string;
}
```

- [ ] Tạo file
- [ ] Dùng trong `deviceStore.ts`: `devices: AdbDevice[]`

### app.ts

- [ ] Move `AppInfo`, `BloatwareEntry`, `DebloatAction` từ service/component
- [ ] Dùng trong `AppManager/types.ts` (re-export hoặc import shared)

### ipc.ts

- [ ] `IpcResponse<T>`, `BatchProgress`, v.v.

### preload.d.ts

- [ ] Thay `Promise<any>` → typed returns
- [ ] Mục tiêu: 0 `any` trong `preload.d.ts`

### Path alias

- [ ] `tsconfig.web.json`, `tsconfig.node.json`, `electron.vite.config.ts`

```json
"@shared/*": ["src/shared/*"]
```

## Thứ tự cập nhật

1. [ ] `shared/types/*`
2. [ ] `preload.d.ts`
3. [ ] `deviceStore.ts`, `settingsStore.ts`
4. [ ] IPC handlers return types (dần dần)

## Tiêu chí hoàn thành

- [ ] `grep "Promise<any>" src/renderer/src/types/preload.d.ts` → 0
- [ ] `devices: any[]` → `AdbDevice[]`
- [ ] IDE autocomplete đầy đủ khi gọi `window.api.*`
