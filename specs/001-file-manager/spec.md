# Feature Specification: FileManager

**Feature Branch**: `001-file-manager`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "FileManager cho phép duyệt, upload, download, xóa file và xem trước ảnh trên thiết bị Android qua ADB"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Duyệt và điều hướng thư mục (Priority: P1)

Người dùng có thể xem danh sách các ổ đĩa/phân vùng lưu trữ ở màn hình Home của FileManager, nhấp vào phân vùng để xem danh sách file/thư mục, và điều hướng qua lại giữa các thư mục (Back, Forward, Up).

**Why this priority**: Đây là tính năng cốt lõi, không có nó thì không thể quản lý file.

**Independent Test**: Có thể kiểm thử độc lập bằng cách mở FileManager, xem danh sách phân vùng, truy cập vào một thư mục, bấm Back quay lại và kiểm tra xem danh sách có đúng không.

**Acceptance Scenarios**:

1. **Given** đang ở màn hình Home của FileManager, **When** ứng dụng tải xong, **Then** hiển thị danh sách các phân vùng lưu trữ (ví dụ: Bộ nhớ trong, Thẻ nhớ).
2. **Given** danh sách phân vùng, **When** người dùng click vào một phân vùng, **Then** hiển thị danh sách các file và thư mục con bên trong phân vùng đó.
3. **Given** đang ở thư mục con, **When** người dùng nhấn nút "Back" hoặc "Up", **Then** hệ thống quay lại thư mục trước đó hoặc thư mục cha tương ứng.

---

### User Story 2 - Quản lý file: Tải lên, tải xuống, tạo thư mục và xóa (Priority: P1)

Người dùng có thể tải file từ máy tính lên điện thoại, tải file từ điện thoại về máy tính, tạo thư mục mới và xóa các file/thư mục đã chọn.

**Why this priority**: Đây là các thao tác quản lý dữ liệu cơ bản.

**Independent Test**: Kiểm thử bằng cách upload một file test, download nó về thư mục khác trên máy tính, sau đó xóa file đó trên thiết bị.

**Acceptance Scenarios**:

1. **Given** đang ở một thư mục trên thiết bị, **When** click "Upload" và chọn file từ máy tính, **Then** file được truyền lên thiết bị và danh sách file tự động cập nhật.
2. **Given** chọn một file trên thiết bị, **When** click "Download" và chọn đường dẫn lưu trên máy tính, **Then** file được tải về máy tính thành công.
3. **Given** đang ở một thư mục, **When** click "Thư mục mới", nhập tên thư mục hợp lệ và xác nhận, **Then** thư mục mới được tạo và hiển thị trong danh sách.
4. **Given** chọn một hoặc nhiều file, **When** click "Xóa" và xác nhận cảnh báo, **Then** các file đó biến mất khỏi thiết bị.

---

### User Story 3 - Xem trước hình ảnh (Priority: P2)

Người dùng có thể xem trước nội dung các file ảnh (jpg, png, gif, webp, bmp) trực tiếp trên ứng dụng mà không cần tải về máy tính.

**Why this priority**: Cải thiện trải nghiệm người dùng, giúp tìm kiếm file ảnh nhanh chóng.

**Independent Test**: Click vào file ảnh `.jpg` trên thiết bị và kiểm tra xem modal hiển thị ảnh preview có xuất hiện và hiển thị đúng ảnh không.

**Acceptance Scenarios**:

1. **Given** danh sách file có chứa file hình ảnh, **When** click đúp hoặc click xem trước file ảnh, **Then** hiển thị modal preview chứa ảnh ở định dạng Base64 và có các nút Zoom In, Zoom Out, Reset Zoom.

---

### User Story 4 - Tìm kiếm và phân trang (Priority: P2)

Người dùng có thể tìm kiếm file theo tên trong thư mục hiện tại và danh sách file được phân trang để tránh đơ ứng dụng khi thư mục có hàng ngàn file.

**Why this priority**: Cần thiết khi quản lý các thư mục hệ thống hoặc thư mục chứa nhiều ảnh (DCIM) có hàng ngàn file.

**Independent Test**: Nhập từ khóa tìm kiếm và kiểm tra danh sách xem có lọc đúng không, chuyển trang để xem các file tiếp theo.

**Acceptance Scenarios**:

1. **Given** thư mục có nhiều hơn 100 file, **When** mở thư mục, **Then** hiển thị 100 file đầu tiên và thanh phân trang (Pagination) ở dưới.
2. **Given** đang ở thư mục, **When** nhập từ khóa vào ô tìm kiếm, **Then** danh sách file được lọc theo tên khớp với từ khóa.

### Edge Cases

- File/thư mục có tên chứa ký tự đặc biệt hoặc tiếng Việt có dấu.
- Tải lên file quá lớn hoặc bộ nhớ thiết bị đầy.
- Mất kết nối thiết bị đột ngột trong quá trình truyền file (ADB disconnected).
- Thư mục không có quyền truy cập (Permission Denied).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST hiển thị danh sách các phân vùng lưu trữ ở thư mục gốc (`HOME`).
- **FR-002**: Hệ thống MUST hỗ trợ liệt kê danh sách tập tin và thư mục thông qua API `window.api.listDirectory`.
- **FR-003**: Hệ thống MUST hỗ trợ tải file từ máy tính lên thiết bị qua `window.api.pushFile`.
- **FR-004**: Hệ thống MUST hỗ trợ tải file từ thiết bị về máy tính qua `window.api.pullFile`.
- **FR-005**: Hệ thống MUST hỗ trợ xóa file/thư mục qua `window.api.deleteFile`.
- **FR-006**: Hệ thống MUST hỗ trợ tạo thư mục mới qua `window.api.createDirectory`.
- **FR-007**: Hệ thống MUST cho phép lấy dữ liệu ảnh Base64 qua `window.api.getFileBase64` để preview ảnh.
- **FR-008**: Hệ thống MUST hiển thị thanh phân trang với kích thước trang là 100 item nếu danh sách file lớn hơn 100.
- **FR-009**: Hệ thống MUST có tính năng tìm kiếm không phân biệt chữ hoa chữ thường trên tên file.

### Key Entities

- **StoragePoint**: Đại diện cho một phân vùng lưu trữ trên thiết bị (ví dụ: `sdcard`, `emulated`). Thuộc tính: `path`, `name`, `freeSpace`, `totalSpace`.
- **FileInfo**: Đại diện cho thông tin một file/thư mục trên Android. Thuộc tính: `name`, `size`, `isDir`, `mtime` (thời gian sửa đổi), `path`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Danh sách file của thư mục có dưới 500 file phải được hiển thị trong vòng dưới 1 giây sau khi click mở.
- **SC-002**: Thao tác xóa file và tạo thư mục phải cập nhật lại giao diện ngay lập tức mà không cần người dùng nhấn nút Refresh thủ công.
- **SC-003**: Xem trước ảnh hoạt động mượt mà với các ảnh có dung lượng dưới 10MB.

## Assumptions

- Thiết bị Android đã được bật USB Debugging và kết nối ổn định qua ADB.
- Các API ADB ở main process (`listDirectory`, `pushFile`, `pullFile`, v.v.) hoạt động ổn định và trả về đúng kiểu dữ liệu.
- Người dùng có quyền đọc/ghi trên thư mục đích trên thiết bị Android (ví dụ: `/sdcard/`).
