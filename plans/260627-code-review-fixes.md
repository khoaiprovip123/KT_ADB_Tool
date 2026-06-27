# Phase: Code Review Fixes — 2026-06-27

## Mục tiêu
Sửa các lỗi phát hiện qua full codebase review ngày 27/06/2026.

---

## SECURITY / BUG (Ưu tiên cao nhất)

- [x] **[SEC-1]** `updateService.ts` — Đổi `spawn(..., { shell: true })` thành `shell: false` khi chạy NSIS installer tải từ internet (tránh command injection nếu path có space)
- [x] **[SEC-2]** `adbSafety.ts:274` — Cải thiện logic chặn `rm -rf /`: bổ sung normalize whitespace trước khi check, tránh bypass bằng double-space hoặc `-r -f`
- [x] **[SEC-3]** `appService.ts:226` — Đổi `pm install` và `rm` từ template string sang `shellQuote()` cho `remotePath` (dù hiện tại path do code tạo, cần đảm bảo an toàn khi refactor)
- [x] **[SEC-4]** `adbCore.ts:35` — Đổi `exec(\`"${adbExe}" start-server\`)` sang `spawn(adbExe, ["start-server"])` để tránh shell injection edge case

---

## MEDIUM

- [x] **[MED-1]** `fileService.ts:162` — Thêm `outStream.close()` / `outStream.destroy()` trong error handler của `pullFile` để tránh file lock trên Windows
- [x] **[MED-2]** `systemTweaksService.ts` — Trong `getTweakStatus` và `applyTweak`, kiểm tra nếu output chứa `[BLOCKED BY SAFETY LAYER]` → trả về lỗi thay vì báo thành công sai
- [x] **[MED-3]** `adbSafety.ts:157` — Ghi chú rõ whitelist `cat ` chỉ an toàn khi path đã được validate qua `validateRemotePath` ở tầng trên

---

## LOW

- [x] **[LOW-1]** `updateService.ts:30` — Thay so sánh version bằng string `!==` sang semver-aware comparison (ít nhất parse major.minor.patch, bỏ suffix `-PRO-MAX`) để tránh false-positive update
- [x] **[LOW-2]** `adbCore.ts` — `watchDevices` không trả về cleanup function → thêm return `() => tracker.removeAllListeners()` để có thể dừng khi app quit
- [x] **[LOW-3]** `deviceStore.ts` — Đổi `devices: any[]` sang typed interface `AdbDevice` (ít nhất `{ id: string; type: string }`) để tăng type-safety

---

## Thứ tự thực hiện đề xuất

1. SEC-1 → SEC-2 → SEC-3 → SEC-4 (security trước)
2. MED-1 (bug thực tế trên Windows)
3. MED-2 → MED-3
4. LOW-1 (fix update checker sai)
5. LOW-2 → LOW-3

---

## Ghi chú
- Tất cả fix không breaking change, không cần update IPC channels
- Sau khi fix LOW-1, cần test thủ công: build app → GitHub release với version mới → kiểm tra update checker
