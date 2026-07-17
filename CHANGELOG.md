# Nhật ký thay đổi (Changelog) - KT ADB Tool

## [2.4.3] - 2026-07-17

### Thêm mới (Added)
- **Tính năng tìm kiếm (Search)**:
  - Thêm ô tìm kiếm trực tiếp vào thanh công cụ của trình Quản lý File (FileManager).

### Cải tiến & Tối ưu hóa (Improved & Optimized)
- **Tối ưu tốc độ lấy dữ liệu RAM**:
  - Chuyển từ lệnh `dumpsys meminfo` sang đọc trực tiếp `/proc/meminfo` qua ADB shell để lấy dung lượng RAM, giúp giảm triệt để tình trạng ứng dụng bị treo/lag khoảng 3 giây khi kết nối thiết bị. Tốc độ lấy thông tin giờ đây gần như tức thời.
- **Kiểm thử tự động (Unit Test)**:
  - Thêm bộ Unit Test bằng Vitest cho các dịch vụ `deviceInfoService` và `fileService`, đạt 8 bài test passed (bao gồm cả test case bắt lỗi parse RAM).

## [2.4.2] - 2026-07-07

### Thêm mới (Added)
- **Cấu hình DNS mã hóa (Private DNS DoT)**:
  - Tích hợp thêm tab cấu hình máy chủ DNS Private (DNS-over-TLS) chuyên sâu.
  - Hỗ trợ các DNS Presets phổ biến nhất kèm mô tả tác dụng chi tiết (Google, Cloudflare, AdGuard chặn quảng cáo, NextDNS, Quad9).
  - Cho phép người dùng cấu hình DNS DoT tùy chỉnh qua ADB (`settings put global private_dns_mode hostname` & `settings put global private_dns_specifier [custom_dns]`).
  - Giao diện Banner DoT trạng thái mạng thời gian thực, có logo Globe động và màu gradient trực quan.

### Cải tiến & Tối ưu hóa (Improved & Optimized)
- **Tái cấu trúc tổng thể Header (ExperienceCenter)**:
  - Gộp bảng thông tin thiết bị cũ và các nút điều khiển vào chung **Header tổng thể** của trang, tạo sự liền mạch.
  - **Thiết kế Single-row**: Đưa toàn bộ các nút điều khiển (`Quét lại`, `Tối ưu SAFE`) và chỉ số sức khỏe thiết bị (`Score %`, `Đã bật: x/y`, `Rủi ro`) lên nằm cùng 1 hàng ngang duy nhất phía bên phải của thông tin thiết bị (khắc phục hoàn toàn việc chia thành 2 hàng chiếm không gian dọc).
- **Tinh giản thanh Menu Điều Hướng (Navigation Tabs)**:
  - Làm gọn và thu nhỏ kích thước của các tab điều hướng ngang (macOS/iOS Segmented Control Style).
  - Giảm font-size tab (`text-[11px]`), giảm padding (`px-2 py-1`), thu nhỏ icon wrapper (`h-4 w-4 rounded`) và icon bên trong (`w-2.5 h-2.5`).
  - Thiết kế lại pill bộ đếm tweak thành dạng tròn nhỏ gọn siêu nhẹ, tự cuộn mượt mọc không chiếm chiều rộng.

### Sửa lỗi (Fixed)
- **Sửa lỗi hiển thị / Cắt xén Tweak Card**:
  - Khắc phục triệt để lỗi các nút bật/tắt (Toggle Switch) và nút khôi phục (Restore) bị cắt mất một nửa ở mép phải khi chạy trên cửa sổ app có chiều rộng hẹp hoặc xuất hiện scrollbar.
  - Sử dụng thuộc tính `w-full min-w-0` ở container cha để kích hoạt chế độ tự co giãn (self-collapse) thích ứng theo container bên ngoài, kết hợp `w-full max-w-full overflow-hidden` trên các card item `ActionRow` / `BloatwareRow` để bắt buộc nội dung văn bản tự co lại, chừa khoảng trống cho toggle switch hiển thị đầy đủ 100%.
- **Sửa lỗi biên dịch (Typecheck)**:
  - Dọn dẹp các import thừa và các component không sử dụng như `ScorePill` giúp loại bỏ hoàn toàn cảnh báo TS6133, vượt qua `npm run typecheck` sạch sẽ.
