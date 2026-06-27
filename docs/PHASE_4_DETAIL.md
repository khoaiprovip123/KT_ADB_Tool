# Phase 4 — Chi tiết: Performance

## 4.1 Virtual Scrolling

### AppManager/index.tsx
Đã có `react-window` trong dependencies nhưng chưa dùng.

```typescript
import { FixedSizeList } from "react-window";

// Thay paginatedPackages.map() bằng:
<FixedSizeList
  height={containerHeight}
  itemCount={filteredPackages.length}
  itemSize={72}
  width="100%"
  itemData={{ packages: filteredPackages, selectedApps, ... }}
>
  {({ index, style, data }) => (
    <div style={style}>
      <AppRow app={data.packages[index]} ... />
    </div>
  )}
</FixedSizeList>
```

### LogTerminal.tsx
```typescript
import { VariableSizeList } from "react-window";

<VariableSizeList
  height={400}
  itemCount={logs.length}
  itemSize={(i) => Math.max(20, Math.ceil(logs[i].length / 80) * 16)}
  width="100%"
>
  {({ index, style }) => (
    <div style={style} className="font-mono text-xs break-words px-2">
      {logs[index]}
    </div>
  )}
</VariableSizeList>
```

## 4.2 Auto-refresh Device Info

### deviceStore.ts — thêm method
```typescript
refreshDeviceInfo: async () => {
  const { activeDevice } = get();
  if (!activeDevice) return;
  const info = await window.api.getDeviceInfo(activeDevice);
  set({ deviceInfo: info });
},
```

### Gọi sau mỗi action thành công:
- useAppActions.ts: sau manageApp success
- useDebloatActions.ts: sau debloat success
- useDisplayControls.ts: sau setDpi/setResolution

### App.tsx — auto-refresh khi device change
```typescript
useEffect(() => {
  if (activeDevice) {
    useDeviceStore.getState().refreshDeviceInfo();
  }
}, [activeDevice]);
```
