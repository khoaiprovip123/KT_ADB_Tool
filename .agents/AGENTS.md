# AGENTS.md - Quy Tắc Dành Cho AI Agent trong Dự Án KT_ADB_Tool Pro

## ⚠️ QUY TẮC BẮT BUỘC: NGUYÊN TẮC GIT COMMIT & PUSH BẢO VỆ MÃ NGUỒN

1. **LUÔN LUÔN CHỜ XÁC NHẬN TỪ NGƯỜI DÙNG BẰNG LỜI (MANDATORY APPROVAL):**
   - TUYỆT ĐỐI KHÔNG ĐƯỢC tự động chạy các lệnh `git commit`, `git push`, `git revert`, `git merge`, `git rebase` hoặc bất kỳ lệnh Git làm thay đổi lịch sử repository khi CHƯA CÓ LỆNH XÁC NHẬN CỤ THỂ từ người dùng.
   - Khi tạo hoặc chỉnh sửa file mã nguồn/tài liệu, AI chỉ được phép thao tác và lưu file tại máy local.
   - Chỉ khi người dùng gõ lệnh trực tiếp trong chat (Ví dụ: *"commit giúp anh"*, *"hãy commit đi"*, *"push lên git nhé"*...) thì AI mới được thực thi lệnh Git.

2. **KIỂM THỬ BẮT BUỘC TRƯỚC KHI BÀN GIAO (PRE-HANDOVER CHECK):**
   - Mọi thay đổi mã nguồn TypeScript trong `src/main`, `src/preload`, `src/renderer` bắt buộc phải vượt qua kiểm tra kiểu dữ liệu `npm run typecheck` đạt **0 lỗi**.
   - Kiểm tra đóng gói ứng dụng Electron bằng `npm run build` hoặc `npm run build:unpack` trước khi bàn giao cho người dùng test.

3. **BẢO VỆ CẤU HÌNH NHẠY CẢM:**
   - Đảm bảo các file cấu hình tạm, token hoặc file rác không bị commit nhầm lên repository.
