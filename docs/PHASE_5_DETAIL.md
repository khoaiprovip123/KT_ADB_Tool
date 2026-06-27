# Phase 5 — Chi tiết: Multi-device + CI/CD

## 5.1 Multi-device Auto-switch

### deviceStore.ts
```typescript
setDevices: (devices) =>
  set((state) => {
    const newDevice = devices.find(
      (d) => d.type === "device" && !state.devices.find((old) => old.id === d.id),
    );
    if (state.activeDevice && devices.find((d) => d.id === state.activeDevice)) {
      return { devices };
    }
    return {
      devices,
      activeDevice: newDevice?.id || devices[0]?.id || null,
    };
  }),
```

### Notification khi device mới:
```typescript
if (newDevice) {
  toast.info(`Thiết bị mới: ${newDevice.model || newDevice.id}`);
}
```

## 5.2 CI Workflow

### .github/workflows/ci.yml
```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

---

# Bonus: Quick Wins

## .nvmrc
```
20
```

## package.json — engines
```json
{ "engines": { "node": ">=18.0.0" } }
```

## husky + lint-staged
```bash
npm install -D husky lint-staged
npx husky init
```
`.husky/pre-commit`: `npx lint-staged`
`package.json`:
```json
{ "lint-staged": { "*.{ts,tsx}": ["eslint --fix", "prettier --write"] } }
```

## CHANGELOG.md
Track version history với format: Added, Changed, Fixed, Security

## CONTRIBUTING.md
Hướng dẫn: setup, code style, commit convention, PR flow
