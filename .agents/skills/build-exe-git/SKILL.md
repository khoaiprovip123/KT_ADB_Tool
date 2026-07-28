---
name: build-exe-git
description: Automates running tests, typecheck, tagging, and pushing git releases publicly when triggered by "build-exe git" or release commands.
---

# Build & Release Executable via Git

Use this skill when the user requests "build-exe git" or asks to build/release a new version.

## Execution Steps

1. **Check Version**: Read `package.json` to get the target `"version"` (e.g., `2.5.0`).
2. **Typecheck & Tests**:
   - Run `npm run typecheck`
   - Run `npm test`
3. **Commit & Tag**:
   - Stage and commit working tree: `git commit -am "release: v<VERSION>"` (if changes exist)
   - Create version tag: `git tag v<VERSION>`
4. **Push to GitHub**:
   - Push main branch and tags: `git push origin main --tags`
5. **Local Release Build**:
   - Run `npm run build:win` in the background for local `.exe` artifact generation.
6. **Report Status**:
   - Confirm tag push to trigger GitHub Actions release.
   - Confirm local `.exe` path (`dist/KT ADB Tool Pro Setup <VERSION>.exe`).
