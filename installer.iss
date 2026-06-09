[Setup]
AppName=DesktopAppCustom
AppVersion=v0.0.1
DefaultDirName={autopf}\DesktopAppCustom
DefaultGroupName=DesktopAppCustom
OutputDir=.\output
OutputBaseFilename=Application_Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
; Đảm bảo trình cài đặt tự động tìm và tắt ứng dụng cũ đang chạy để tránh lỗi File Lock
CloseApplications=yes
TouchDate=none

[Files]
; Lấy toàn bộ thư mục output đã được PyInstaller biên dịch ra trước đó
Source: ".\dist\main\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\DesktopAppCustom"; Filename: "{app}\main.exe"
Name: "{autodesktop}\DesktopAppCustom"; Filename: "{app}\main.exe"

[Run]
; Tùy chọn khởi chạy ứng dụng ngay sau khi tiến trình cài đặt kết thúc
Filename: "{app}\main.exe"; Description: "Launch Application"; Flags: nowait postinstall skipifsilent
