# Nhật ký thay đổi (Changelog) - KT ADB Tool

## [2.5.3] - 2026-08-06

### Thêm mới (Added)
- **Tích hợp Danh Mục Khối Lệnh MIUI / HyperOS (Android 9–17 Standard)**:
  - Tích hợp quy chuẩn danh mục khối lệnh AOSP & Xiaomi MIUI/HyperOS vào `xiaomiExperienceRegistry.ts`.
  - Thêm các tính năng AOSP Stable mới: `Chế độ Tối hệ thống (cmd uimode night)`, `Độ trễ nhấn giữ 300ms (long_press_timeout)`, `Hiển thị điểm chạm cảm ứng (show_touches)`, `Hiển thị tọa độ con trỏ (pointer_location)`, `Chế độ Tiết kiệm pin hệ thống (low_power)`, `Chống nhấp nháy màn hình (dc_back_light / DC Dimming)`.
- **Nâng cấp Bảng Chi Tiết Tweak (Action Inspector Modal)**:
  - Tích hợp **Nút Bật / Tắt trực tiếp** ngay tại bảng chi tiết (Bật/Tắt tức thì mà không cần đóng modal).
  - Thêm **Thẻ tag phân loại hãng thiết bị** (`Xiaomi`, `Samsung`, `AOSP`) cạnh tiêu đề card.
  - Tích hợp **Thanh cuộn tùy biến (`custom-scrollbar`)** giúp cuộn mượt mà toàn bộ nội dung mà không bị che khuất.
- **Tối ưu Sửa Trễ Thông Báo Đa Tầng (Fix-Noti-Xiaomi Integration)**:
  - Nâng cấp bộ công cụ sửa trễ thông báo 104/104 app với Standby Bucket ACTIVE (Level 10), AppOps Ignore, Doze Whitelist và danh sách trắng Xiaomi `millet_white`.

### Sửa lỗi & Tối ưu hóa (Fixed & Optimized)
- **Sửa triệt để lỗi `service call` trên Windows (`advanced_textures_hyperos`)**:
  - Chuyển phương thức thực thi lệnh ADB `service call` qua `execFilePromise` mảng đối số độc lập để tránh bị Windows `cmd.exe` xé nhỏ chuỗi tham số `s16` có chứa dấu cách.
  - Sửa lệnh kích hoạt Họa tiết nâng cao HyperOS 2 / HyperOS 3 đồng bộ trên cả `system`, `global` namespaces và `deviceLevelList` để công tắc Cài đặt điện thoại bật xanh ngay lập tức.
- **Sửa lỗi Safety Layer chặn lệnh `cmd uimode`**:
  - Bổ sung `cmd uimode` vào danh sách trắng lệnh an toàn trong `adbSafety.ts`.
- **Đồng bộ bộ kiểm thử tự động**:
  - Đạt 100% 71/71 unit tests passed across 11 test suites, 0 typecheck errors.

## [2.5.0] - 2026-07-28

### Thêm mới (Added)
- **Menu Dọn Dẹp Nhanh & Tối Ưu RAM (Quick Cleaner)**:
  - Thêm phân khu chức năng dọn dẹp rác hệ thống, bộ nhớ tạm, giải phóng RAM tương thích Android 11 đến 16-17.
  - **Hỗ trợ 2 Chế độ dọn dẹp**:
    - *Thao Tác Nhanh (1-Click Clean)*: Quét và giải phóng toàn bộ logcat, temp files, trim caches, đóng app ngầm và nén bộ nhớ RAM chỉ với 1 cú nhấp chuột.
    - *Tùy Chỉnh (Custom Clean)*: Tự chọn từng mục dọn dẹp theo nhu cầu.
  - **Dọn dẹp chuyên sâu Telegram, Nekogram & MXH**: Xóa file đệm hình ảnh, video, sticker tạm của Telegram, Nekogram, Zalo, Messenger, TikTok, Facebook, Instagram.
  - **Popup Tiến trình Realtime (Cleaning Progress Modal)**: Hiển thị % tiến trình, icon tác vụ, log terminal ADB realtime và thống kê dung lượng RAM/Storage đã giải phóng.
  - **Giao diện Whitelist nâng cấp**: Cho phép tự động quét danh sách app cài trên thiết bị, tìm kiếm tên gói realtime và chọn ứng dụng bảo vệ bằng checkbox.

### Cải tiến & Tối ưu hóa (Improved & Optimized)
- **Triệt hạ app ngầm mạnh mẽ (Fast App Killer)**:
  - Nâng cấp sử dụng kịch bản đa tầng `am force-stop --user 0`, `am kill --user 0` và `pkill -9 -f` cho toàn bộ ứng dụng cài thêm, đảm bảo giải phóng triệt để RAM bị chiếm dụng.
  - Tích hợp lệnh nén bộ nhớ runtime ART `am compact full` giải phóng RAM ngầm tối đa trên Android 10+.
- **Nâng cấp Tùy chọn Tần Số Quét Màn Hình (Refresh Rate)**:
  - Tự động nhận diện và hiển thị động tần số quét màn hình thực tế (60Hz / 90Hz / 120Hz / 144Hz) của thiết bị.
  - Thêm dải nút chọn Hz tùy chỉnh linh hoạt (`60Hz | 90Hz | 120Hz | 144Hz`) thay cho giá trị cố định 120Hz cũ.
  - Đồng bộ tiêu đề và Popup xác nhận cảnh báo an toàn theo số Hz thực tế.
- **Tối ưu giao diện cuộn (Scrollable Layout)**:
  - Thêm `overflow-y-auto` giúp cuộn mượt các thẻ card phân khu dọn dẹp tùy chỉnh không bị tràn màn hình.


### Cải tiến & Tối ưu hóa (Improved & Optimized)
- **Tương thích Android 16+ (HyperOS)**:
  - Tự động chuyển hướng (Auto-fallback) từ `pm disable-user` sang `pm uninstall -k --user 0` khi bị chặn bởi `SecurityException` trên Android 14+/16.
  - Tối ưu hóa lệnh ART Compiler: Tự động fallback từ `cleanup-dex-files` sang `cmd package compile -r bg-dexopt --all` trên các hệ điều hành mới.
  - Chuẩn hóa thông báo lỗi khi gỡ/tắt ứng dụng: Hiển thị thông báo thân thiện `"Hiện tại không tìm thấy ứng dụng <package> trong hệ thống của bạn, vui lòng kiểm tra lại."` thay vì ném ra Java Stack Trace.

### Sửa lỗi (Fixed)
- **Sửa lỗi không nhập được chữ vào ô Tìm kiếm**:
  - Khắc phục sự kiện `keydown` phím tắt toàn cục trong `AppManager` tự động gọi `e.preventDefault()`, giúp gõ và chọn văn bản trong ô tìm kiếm hoạt động bình thường.
- **Sửa lỗi trạng thái Tweak "Sửa lỗi trễ thông báo Xiaomi"**:
  - Sửa hàm kiểm tra trạng thái `getTweakStatus` để cập nhật chính xác nút gạt ON/OFF của tính năng Sửa lỗi trễ thông báo Xiaomi khi áp dụng thành công.

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
