# Phase 3 — Chi tiết: Tests + Unified Toast

## 3.1 Renderer Tests

### tests/renderer/stores/deviceStore.test.ts
```
Test cases:
- auto-select first device when setDevices called
- keep activeDevice if still in list
- fallback to first device if activeDevice removed
- limit logs to 1000 entries
- clearLogs works
```

### tests/renderer/stores/toastStore.test.ts
```
Test cases:
- add toast with correct type/message
- auto-remove after duration (fakeTimers)
- remove specific toast by id
- toast.success/error/info/warning helpers
```

### tests/renderer/utils/errorHandler.test.ts
```
Test cases:
- return AdbError as-is
- map ECONNREFUSED → Vietnamese message
- identify ECONNRESET from message string
- handle unknown errors gracefully
```

## 3.2 Unified Toast

### AdvancedAdb.tsx
- Xóa: `interface ToastMessage`, `useState<ToastMessage[]>`, custom toast rendering
- Thêm: `import { toast } from "../../store/toastStore"`
- Thay: `setToasts(...)` → `toast.success/error/info/warning(...)`

### UserExperience.tsx
- Tương tự nếu có custom toast state
