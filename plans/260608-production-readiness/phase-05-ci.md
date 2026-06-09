# Phase 5: Test & CI
Priority: **P1** | Estimate: **4–5 ngày**

## Mục tiêu

CI xanh trên mỗi PR; coverage main/core ≥ 60%.

## 5.1 Mở rộng unit test

### Test mới đề xuất

| File test | Module | Cases |
|-----------|--------|-------|
| `adbCore.test.ts` | runAdbCommand | block unsafe cmd, clean output |
| `systemTweaksService.test.ts` | debloat | blacklist packages, preferDisable |
| `appService.test.ts` | manageApp | reject BLACKLIST pkgs |
| `deviceService.test.ts` | validate deviceId | (nếu tách validate) |

- [ ] Thêm `adbCore.test.ts` (mock adbkit)
- [ ] Thêm `systemTweaksService.test.ts`
- [ ] Thêm `appService.test.ts`
- [ ] Mục tiêu: **≥ 50 tests** (hiện 33)

### Chạy test

```bash
npm test
npm test -- --coverage   # nếu bật coverage trong vitest.config
```

## 5.2 GitHub Actions

Tạo `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run typecheck

      - run: npm test

      - run: npm run build
```

### Release workflow (tuỳ chọn)

Tạo `.github/workflows/release.yml` — trigger on tag `v*`:

- [ ] `npm run build:win`
- [ ] Upload artifact installer

## Checklist

- [ ] Tạo `.github/workflows/ci.yml`
- [ ] Push → CI chạy xanh
- [ ] Branch protection: require CI pass (GitHub settings)
- [ ] ≥ 50 unit tests
- [ ] Document trong README: badge CI (tuỳ chọn)

## Tiêu chí hoàn thành

- [ ] CI xanh trên PR
- [ ] Không merge khi typecheck fail
- [ ] Test count ≥ 50
