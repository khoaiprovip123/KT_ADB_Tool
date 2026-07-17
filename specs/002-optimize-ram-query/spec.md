# Feature Specification: Optimize RAM Query

**Feature Branch**: `002-optimize-ram-query`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Tối ưu hóa tốc độ lấy thông số RAM của thiết bị bằng cách thay thế dumpsys meminfo bằng cat /proc/meminfo"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tối ưu hóa thời gian tải thông tin thiết bị (Priority: P1)

Người dùng kết nối thiết bị Android và mở Bảng điều khiển. Hệ thống sẽ hiển thị dung lượng RAM tổng và RAM trống cực kỳ nhanh chóng (dưới 500ms) thay vì phải đợi 2-5 giây như trước đây.

**Why this priority**: Cải thiện trải nghiệm người dùng, giúp công cụ hoạt động mượt mà và không gây gián đoạn (lag) giao diện khi cập nhật thông tin thiết bị.

**Independent Test**: Kết nối thiết bị, chuyển đổi qua lại các tab hoặc nhấn Refresh thông tin thiết bị và kiểm tra xem thông tin RAM có hiển thị ngay lập tức không.

**Acceptance Scenarios**:

1. **Given** thiết bị Android đã kết nối ổn định qua ADB, **When** ứng dụng truy vấn thông tin thiết bị (`getDeviceInfo`), **Then** thời gian phản hồi cho phần lấy RAM phải nhỏ hơn 500ms.
2. **Given** dữ liệu từ `/proc/meminfo` của thiết bị, **When** hệ thống phân tích dung lượng, **Then** RAM tổng (`MemTotal`) và RAM khả dụng (`MemAvailable` hoặc fallback `MemFree`) phải được tính toán chính xác sang đơn vị MB.

### Edge Cases

- File `/proc/meminfo` không tồn tại hoặc không thể đọc được trên các thiết bị Android quá cũ hoặc tùy biến quá sâu (cần fallback về 0 hoặc một cơ chế dự phòng an toàn).
- Regex không bắt đúng định dạng dữ liệu (ví dụ khoảng trắng không đồng đều giữa các trường).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST thay thế lệnh `dumpsys meminfo` bằng `cat /proc/meminfo` để lấy thông số RAM.
- **FR-002**: Hệ thống MUST sử dụng Regex để trích xuất chính xác giá trị của `MemTotal` (RAM tổng) và `MemAvailable` (RAM trống) từ kết quả của `/proc/meminfo`.
- **FR-003**: Hệ thống MUST hỗ trợ cơ chế fallback đọc `MemFree` nếu không tìm thấy trường `MemAvailable`.
- **FR-004**: Hệ thống MUST quy đổi đơn vị từ Kilobytes (KB) của `/proc/meminfo` sang Megabytes (MB) để đồng bộ với định dạng cũ.
- **FR-005**: Hệ thống MUST chạy thành công bộ unit tests mà không làm gãy các test case hiện có.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tốc độ lấy thông tin RAM từ thiết bị qua ADB giảm từ 2-5 giây xuống dưới 200ms.
- **SC-002**: Không xảy ra lỗi crash ứng dụng hoặc trả về RAM = 0 khi kết nối các thiết bị Android tiêu chuẩn.
