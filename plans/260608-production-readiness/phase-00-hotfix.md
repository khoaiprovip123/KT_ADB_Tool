# Phase 0: Hotfix Build
Priority: **P0** | Estimate: **0.5–1 ngày**

## Mục tiêu

`npm run typecheck` và `npm run build` pass 100%.

## Vấn đề

```
src/renderer/src/components/features/UserExperience.tsx(448,36):
  Property 'usedFallback' does not exist on type '{ success: boolean; output: string; }'
```

Backend `xiaomiExperienceService.ts` **đã trả** `usedFallback`, nhưng `preload.d.ts` **chưa khai báo**.

## Checklist

### Bước 1 — Tạo shared type

- [x] Tạo `src/shared/types/xiaomi.ts`:

```typescript
export interface XiaomiApplyResult {
  success: boolean;
  output: string;
  usedFallback?: boolean;
}

export interface XiaomiRollbackResult {
  success: boolean;
  output: string;
}
```

- [x] Tạo `src/shared/types/index.ts` re-export

### Bước 2 — Cập nhật preload types

- [x] Sửa `src/renderer/src/types/preload.d.ts`:

```typescript
// Thay:
applyXiaomiItem: (...) => Promise<{ success: boolean; output: string }>;

// Bằng:
applyXiaomiItem: (...) => Promise<XiaomiApplyResult>;
```

- [x] Import type từ `@shared/types` hoặc path tương đối

### Bước 3 — (Tuỳ chọn) Đồng bộ backend

- [x] `xiaomiExperienceService.ts` import `XiaomiApplyResult` thay vì inline type

### Bước 4 — Cấu hình path alias (nếu dùng `@shared`)

- [x] `tsconfig.web.json` + `tsconfig.node.json`:

```json
"paths": {
  "@shared/*": ["src/shared/*"]
}
```

- [x] `electron.vite.config.ts` alias tương ứng cho main/preload/renderer

### Bước 5 — Verify

- [x] `npm run typecheck` → 0 errors
- [x] `npm test` → 33/33 pass
- [x] `npm run dev` → mở tab **Trải nghiệm người dùng**
- [x] Toggle 1 item Xiaomi → toast hiện đúng (có/không fallback)

## Tiêu chí hoàn thành

- [x] Typecheck pass
- [x] Không regression UI tab Xiaomi
- [ ] Commit message gợi ý: `fix: add usedFallback to XiaomiApplyResult type`

## Ghi chú

Đây là **blocker duy nhất** cho `npm run build`. Làm xong phase này trước mọi thứ khác.
