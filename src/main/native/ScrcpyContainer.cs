// ScrcpyContainer.cs — Quản lý lifecycle scrcpy và tự động snap aspect ratio chuẩn xác (trừ hao Non-Client Area)
// Hỗ trợ tự do phóng to (Scale-Up) đồng tỉ lệ cả khung lẫn nội dung từ nhỏ lên cực đại màn hình
// Tự động dịch vị trí Auto-Shift tránh cấn Taskbar và triệt tiêu 100% khoảng đen thừa
// Tự động dọn dẹp tiến trình qua Windows Job Object (0 zombie processes)
// Khóa vô hiệu hóa Maximize box tránh bấm nhầm bung dải đen 16:9
// KHÔNG có keyboard hook, KHÔNG can thiệp phím, KHÔNG ADBKeyboard broadcast
// Scrcpy nhận phím 100% native qua --keyboard=sdk

using System;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace KT_ADB_Tool.Native {

    static class ScrcpyHelper {

        // ============================================================
        // P/Invoke
        // ============================================================
        [DllImport("user32.dll")] static extern IntPtr FindWindow(string cls, string title);
        [DllImport("user32.dll")] static extern bool   SetProcessDPIAware();
        [DllImport("user32.dll")] static extern bool   SetProcessDpiAwarenessContext(IntPtr ctx);
        [DllImport("user32.dll")] static extern bool   GetWindowRect(IntPtr hWnd, out RECT lpRect);
        [DllImport("user32.dll")] static extern bool   GetClientRect(IntPtr hWnd, out RECT lpRect);
        [DllImport("user32.dll")] static extern bool   SetWindowPos(IntPtr hWnd, IntPtr ins, int x, int y, int cx, int cy, uint f);
        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        static extern bool SetWindowText(IntPtr hWnd, string lpString);

        [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr hWnd, int nIndex);
        [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

        // Job Object APIs để bảo đảm 100% tiến trình con (scrcpy) tự động chết khi cha thoát/bị kill
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
        static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);
        [DllImport("kernel32.dll")]
        static extern bool SetInformationJobObject(IntPtr hJob, int JobObjectInfoClass, IntPtr lpJobObjectInfo, uint cbJobObjectInfoLength);
        [DllImport("kernel32.dll")]
        static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);
        [DllImport("kernel32.dll")]
        static extern bool CloseHandle(IntPtr hObject);

        [StructLayout(LayoutKind.Sequential)]
        struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
            public long PerProcessUserTimeLimit;
            public long PerJobUserTimeLimit;
            public uint LimitFlags;
            public UIntPtr MinimumWorkingSetSize;
            public UIntPtr MaximumWorkingSetSize;
            public uint ActiveProcessLimit;
            public UIntPtr Affinity;
            public uint PriorityClass;
            public uint SchedulingClass;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct IO_COUNTERS {
            public ulong ReadOperationCount;
            public ulong WriteOperationCount;
            public ulong OtherOperationCount;
            public ulong ReadTransferCount;
            public ulong WriteTransferCount;
            public ulong OtherTransferCount;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
            public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
            public IO_COUNTERS IoInfo;
            public UIntPtr ProcessMemoryLimit;
            public UIntPtr JobMemoryLimit;
            public UIntPtr PeakProcessMemoryLimit;
            public UIntPtr PeakJobMemoryLimit;
        }

        const int JobObjectExtendedLimitInformation = 9;
        const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;

        // WinEvent hook — EVENT_SYSTEM_MOVESIZEEND: fires khi user thả chuột sau resize/move
        delegate void WinEventDelegate(IntPtr hHook, uint ev, IntPtr hwnd,
            int idObj, int idChild, uint idThread, uint ms);
        [DllImport("user32.dll")] static extern IntPtr SetWinEventHook(
            uint evMin, uint evMax, IntPtr hMod, WinEventDelegate cb,
            uint pid, uint tid, uint flags);
        [DllImport("user32.dll")] [return: MarshalAs(UnmanagedType.Bool)]
        static extern bool UnhookWinEvent(IntPtr h);

        // ============================================================
        // Constants
        // ============================================================
        const uint EVENT_SYSTEM_MOVESIZEEND = 0x000B;
        const uint WINEVENT_OUTOFCONTEXT    = 0x0000;
        const uint SWP_NOSIZE               = 0x0001;
        const uint SWP_NOMOVE               = 0x0002;
        const uint SWP_NOZORDER             = 0x0004;
        const uint SWP_NOACTIVATE           = 0x0010;
        const uint SWP_FRAMECHANGED         = 0x0020;

        const int GWL_STYLE         = -16;
        const int WS_MAXIMIZEBOX    = 0x00010000;

        [StructLayout(LayoutKind.Sequential)]
        struct RECT { public int Left, Top, Right, Bottom; }

        // ============================================================
        // State
        // ============================================================
        static string logFile       = "";
        static string serial        = "";
        static string scrcpyExe     = "";
        static string keyboardMode  = "sdk";
        static bool   turnScreenOff = false;
        static string windowTitle   = "";

        // Aspect ratio cập nhật ĐỘNG từ "Texture: WxH" stdout
        static double deviceRatio   = 0.0;
        static int    texW = 0, texH = 0;
        static int    lastClientW = 0, lastClientH = 0;

        static IntPtr scrcpyHwnd    = IntPtr.Zero;
        static Process scrcpyProc   = null;
        static IntPtr hookWinEv     = IntPtr.Zero;
        static IntPtr jobHandle     = IntPtr.Zero;

        // Delegate ref để tránh GC
        static WinEventDelegate winEvDelegate;

        // ============================================================
        // Main
        // ============================================================
        [STAThread]
        static void Main(string[] args) {
            // Thiết lập DPI Awareness Per-Monitor V2 để toạ độ chuẩn xác trên mọi màn hình
            try {
                SetProcessDpiAwarenessContext((IntPtr)(-4));
            } catch {
                try { SetProcessDPIAware(); } catch { }
            }

            // Lưu log ở thư mục Temp
            logFile = Path.Combine(Path.GetTempPath(), "scrcpy_container.log");
            try { File.WriteAllText(logFile, ""); } catch { }
            Log("=== ScrcpyHelper Start (perfect client aspect-ratio snap & scale-up) ===");

            ParseArgs(args);
            if (!LaunchScrcpy()) return;

            // WinEvent hook cho MOVESIZEEND — snap ratio sau khi user thả chuột
            winEvDelegate = WinEvCallback;
            uint pid = scrcpyProc != null ? (uint)scrcpyProc.Id : 0;
            hookWinEv = SetWinEventHook(
                EVENT_SYSTEM_MOVESIZEEND, EVENT_SYSTEM_MOVESIZEEND,
                IntPtr.Zero, winEvDelegate,
                pid, 0, WINEVENT_OUTOFCONTEXT);
            Log("WinEvent hook=" + hookWinEv.ToInt64() + " pid=" + pid);

            // Message pump — cần cho WinEvent hook hoạt động
            Application.Run();

            if (hookWinEv != IntPtr.Zero) UnhookWinEvent(hookWinEv);
            if (jobHandle != IntPtr.Zero) CloseHandle(jobHandle);
            Log("=== Exit ===");
        }

        // ============================================================
        // ParseArgs
        // ============================================================
        static void ParseArgs(string[] args) {
            for (int i = 0; i < args.Length; i++) {
                if      (args[i] == "--serial"   && i+1 < args.Length) serial        = args[++i];
                else if (args[i] == "--ratio"    && i+1 < args.Length) {
                    double r;
                    if (double.TryParse(args[++i], NumberStyles.Any, CultureInfo.InvariantCulture, out r) && r > 0)
                        deviceRatio = r;
                }
                else if (args[i] == "--scrcpy"   && i+1 < args.Length) scrcpyExe    = args[++i];
                else if (args[i] == "--keyboard" && i+1 < args.Length) keyboardMode  = args[++i];
                else if (args[i] == "--turn-screen-off") turnScreenOff = true;
                else if (args[i] == "--title"    && i+1 < args.Length) windowTitle   = args[++i];
            }
            Log(string.Format("serial={0} initRatio={1:F4} keyboard={2} title={3}", serial, deviceRatio, keyboardMode, windowTitle));
        }

        // ============================================================
        // Launch scrcpy native
        // ============================================================
        static bool LaunchScrcpy() {
            if (!File.Exists(scrcpyExe)) {
                Log("ERROR: scrcpy not found: " + scrcpyExe);
                return false;
            }

            string childTitle = "SCRCPY_EMBED_" + Process.GetCurrentProcess().Id;
            string keyboard   = (keyboardMode == "uhid") ? "sdk" : keyboardMode;
            string displayTitle = !string.IsNullOrEmpty(windowTitle) ? windowTitle : "KT ADB Tool - Mirror";

            string scrcpyArgs = string.Format(
                "-s \"{0}\" --no-audio --window-title=\"{1}\" --keyboard={2}",
                serial, childTitle, keyboard);
            if (turnScreenOff) scrcpyArgs += " --turn-screen-off";
            Log("Launch: " + scrcpyArgs);

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName               = scrcpyExe;
            psi.Arguments              = scrcpyArgs;
            psi.UseShellExecute        = false;
            psi.CreateNoWindow         = true;
            psi.WindowStyle            = ProcessWindowStyle.Hidden;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError  = true;

            try {
                scrcpyProc = Process.Start(psi);
                Log("PID=" + (scrcpyProc != null ? scrcpyProc.Id.ToString() : "null"));

                // Gắn vào Windows Job Object để bảo đảm scrcpy tự động thoát khi ScrcpyContainer kết thúc
                BindProcessToJob(scrcpyProc);
            } catch (Exception ex) {
                Log("ERROR: " + ex.Message);
                return false;
            }

            // Parse stdout "Texture: WxH" → cập nhật ratio động và tự động snap khi xoay màn hình
            scrcpyProc.OutputDataReceived += (s, ev) => {
                if (ev.Data == null) return;
                Log("[out] " + ev.Data);
                int idx = ev.Data.IndexOf("Texture:", StringComparison.OrdinalIgnoreCase);
                if (idx >= 0) {
                    string rest = ev.Data.Substring(idx + 8).Trim();
                    string[] parts = rest.Split('x');
                    int w, h;
                    if (parts.Length == 2 &&
                        int.TryParse(parts[0].Trim(), out w) &&
                        int.TryParse(parts[1].Trim(), out h) &&
                        w > 0 && h > 0) {
                        bool isFirst = (texW == 0 || texH == 0);
                        bool wasLandscape = (texW > texH);
                        bool isLandscape = (w > h);
                        bool orientChanged = (!isFirst && wasLandscape != isLandscape);

                        texW = w; texH = h;
                        deviceRatio = (double)w / h;
                        Log(string.Format("Texture={0}x{1} ratio={2:F6} orientChanged={3} isFirst={4}", w, h, deviceRatio, orientChanged, isFirst));

                        if (scrcpyHwnd != IntPtr.Zero) {
                            if (isFirst || orientChanged) {
                                // Tự động snap lại cửa sổ khi khởi tạo hoặc xoay màn hình
                                ThreadPool.QueueUserWorkItem((_) => {
                                    Thread.Sleep(100);
                                    SnapWindow(scrcpyHwnd, true);
                                });
                            }
                        }
                    }
                }
                if (scrcpyHwnd != IntPtr.Zero && !string.IsNullOrEmpty(displayTitle)) {
                    SetWindowText(scrcpyHwnd, displayTitle);
                }
            };
            scrcpyProc.ErrorDataReceived += (s, ev) => { if (ev.Data != null) Log("[err] " + ev.Data); };
            scrcpyProc.BeginOutputReadLine();
            scrcpyProc.BeginErrorReadLine();

            // Tìm HWND để WinEvent hook nhận diện đúng cửa sổ và đổi title sang tên thiết bị
            string st = childTitle;
            ThreadPool.QueueUserWorkItem((_) => {
                for (int i = 0; i < 200; i++) {
                    Thread.Sleep(100);
                    if (scrcpyProc == null || scrcpyProc.HasExited) { Application.Exit(); return; }
                    IntPtr h = FindWindow(null, st);
                    if (h != IntPtr.Zero) {
                        scrcpyHwnd = h;
                        Log("HWND=0x" + h.ToInt64().ToString("X8"));

                        // Vô hiệu hóa Maximize box để ngăn người dùng bấm nhầm bung toàn màn hình 16:9 sinh ra viền đen
                        try {
                            int style = GetWindowLong(h, GWL_STYLE);
                            if ((style & WS_MAXIMIZEBOX) != 0) {
                                SetWindowLong(h, GWL_STYLE, style & ~WS_MAXIMIZEBOX);
                                SetWindowPos(h, IntPtr.Zero, 0, 0, 0, 0,
                                    SWP_NOSIZE | SWP_NOMOVE | SWP_NOZORDER | SWP_FRAMECHANGED | SWP_NOACTIVATE);
                                Log("Disabled WS_MAXIMIZEBOX");
                            }
                        } catch { }

                        SetWindowText(h, displayTitle);
                        Log("Title set: " + displayTitle);

                        // Nếu Texture đã có, snap ngay theo chuẩn tối ưu. Nếu chưa có, đợi event Texture đến sẽ snap!
                        if (texW > 0 && texH > 0) {
                            SnapWindow(h, true);
                        }
                        break;
                    }
                }
            });

            scrcpyProc.EnableRaisingEvents = true;
            scrcpyProc.Exited += (s, ev) => {
                Log("Scrcpy exited");
                try { Application.Exit(); } catch { }
            };

            return true;
        }

        // ============================================================
        // BindProcessToJob: Windows Job Object đảm bảo 100% không zombie
        // ============================================================
        static void BindProcessToJob(Process proc) {
            if (proc == null) return;
            try {
                jobHandle = CreateJobObject(IntPtr.Zero, null);
                if (jobHandle == IntPtr.Zero) return;

                JOBOBJECT_EXTENDED_LIMIT_INFORMATION info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
                info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

                int length = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
                IntPtr infoPtr = Marshal.AllocHGlobal(length);
                try {
                    Marshal.StructureToPtr(info, infoPtr, false);
                    if (SetInformationJobObject(jobHandle, JobObjectExtendedLimitInformation, infoPtr, (uint)length)) {
                        AssignProcessToJobObject(jobHandle, proc.Handle);
                        Log("Bound scrcpy to JobObject (KILL_ON_JOB_CLOSE)");
                    }
                } finally {
                    Marshal.FreeHGlobal(infoPtr);
                }
            } catch (Exception ex) {
                Log("JobObject bind warning: " + ex.Message);
            }
        }

        // ============================================================
        // WinEvent: EVENT_SYSTEM_MOVESIZEEND
        // ============================================================
        static void WinEvCallback(IntPtr hHook, uint ev, IntPtr hwnd,
                                   int idObj, int idChild, uint idThread, uint ms) {
            if (hwnd == IntPtr.Zero || hwnd != scrcpyHwnd) return;
            SnapWindow(hwnd, false);
        }

        // ============================================================
        // SnapWindow: Căn chỉnh Aspect Ratio dựa trên CLIENT AREA
        // Triệt tiêu 100% khoảng đen (pillarbox / letterbox)
        // Hỗ trợ phóng to (Scale-Up) đồng tỉ lệ cả khung lẫn nội dung
        // Tự động Auto-Shift vị trí tránh cấn Taskbar khi kéo to
        // ============================================================
        static void SnapWindow(IntPtr hwnd, bool orientationChanged) {
            if (hwnd == IntPtr.Zero || deviceRatio <= 0) return;

            RECT wr;
            if (!GetWindowRect(hwnd, out wr)) return;
            RECT cr;
            if (!GetClientRect(hwnd, out cr)) return;

            int winW = wr.Right - wr.Left;
            int winH = wr.Bottom - wr.Top;
            int clientW = cr.Right - cr.Left;
            int clientH = cr.Bottom - cr.Top;

            // Nếu kích thước không thay đổi (User chỉ di chuyển cửa sổ, không resize) → KHÔNG can thiệp vị trí!
            bool sizeChanged = (lastClientW > 0 && lastClientH > 0 &&
                (Math.Abs(clientW - lastClientW) > 4 || Math.Abs(clientH - lastClientH) > 4));
            if (!orientationChanged && !sizeChanged && lastClientW > 0) {
                return;
            }

            // Tính chính xác phần viền không thuộc Client (Title Bar, viền DWM trái/phải/dưới)
            int borderW = winW - clientW;
            int borderH = winH - clientH;

            Screen screen = Screen.FromHandle(hwnd);
            System.Drawing.Rectangle workArea = (screen != null) ? screen.WorkingArea : Screen.PrimaryScreen.WorkingArea;

            // Giới hạn vùng vẽ tối đa vừa khít trong màn hình (từ đỉnh tới sát Taskbar)
            int maxClientH = Math.Max(200, workArea.Height - borderH);
            int maxClientW = Math.Max(200, workArea.Width - borderW);

            int targetClientW = clientW;
            int targetClientH = clientH;

            bool isLandscape = (texW > texH);

            if (orientationChanged) {
                int prevLongSide = (lastClientW > 0 && lastClientH > 0)
                    ? Math.Max(lastClientW, lastClientH)
                    : Math.Max(clientW, clientH);

                if (prevLongSide > 120) {
                    // Khi xoay màn hình (Dọc <-> Ngang), bảo tồn nguyên vẹn kích thước thu phóng mà user đã kéo:
                    // Chiều dài thân máy (long side) giữ nguyên, xoay 90 độ
                    if (isLandscape) {
                        targetClientW = prevLongSide;
                        targetClientH = (int)Math.Round(targetClientW / deviceRatio);
                    } else {
                        targetClientH = prevLongSide;
                        targetClientW = (int)Math.Round(targetClientH * deviceRatio);
                    }
                } else {
                    // Tự động căn chỉnh kích thước khởi đầu tối ưu ở lần mở đầu tiên
                    if (isLandscape) {
                        targetClientH = Math.Min(600, (int)(workArea.Height * 0.60));
                        targetClientW = (int)Math.Round(targetClientH * deviceRatio);
                    } else {
                        targetClientH = Math.Min(maxClientH, (int)(workArea.Height * 0.82));
                        targetClientW = (int)Math.Round(targetClientH * deviceRatio);
                    }
                }

                // Bảo vệ không bị tràn màn hình khi xoay
                if (targetClientW > maxClientW) {
                    targetClientW = maxClientW;
                    targetClientH = (int)Math.Round(targetClientW / deviceRatio);
                }
                if (targetClientH > maxClientH) {
                    targetClientH = maxClientH;
                    targetClientW = (int)Math.Round(targetClientH * deviceRatio);
                }
            } else {
                // User kéo resize cửa sổ thủ công:
                int deltaW = Math.Abs(clientW - lastClientW);
                int deltaH = Math.Abs(clientH - lastClientH);

                if (isLandscape) {
                    if (deltaW > deltaH * 1.5) {
                        targetClientW = clientW;
                        targetClientH = (int)Math.Round(targetClientW / deviceRatio);
                    } else {
                        targetClientH = clientH;
                        targetClientW = (int)Math.Round(targetClientH * deviceRatio);
                    }
                } else {
                    // Portrait:
                    if (deltaW > deltaH * 1.5) {
                        // User kéo cạnh bên: tính kích thước đồng tỉ lệ theo clientW
                        targetClientW = clientW;
                        targetClientH = (int)Math.Round(targetClientW / deviceRatio);
                    } else if (deltaH > deltaW * 1.5) {
                        // User kéo cạnh đáy: tính kích thước đồng tỉ lệ theo clientH
                        targetClientH = clientH;
                        targetClientW = (int)Math.Round(targetClientH * deviceRatio);
                    } else {
                        // Kéo góc chéo: chọn chiều có mức tăng tương đối lớn hơn
                        double scaleFromW = (double)clientW / Math.Max(1, lastClientW);
                        double scaleFromH = (double)clientH / Math.Max(1, lastClientH);
                        if (scaleFromW >= scaleFromH) {
                            targetClientW = clientW;
                            targetClientH = (int)Math.Round(targetClientW / deviceRatio);
                        } else {
                            targetClientH = clientH;
                            targetClientW = (int)Math.Round(targetClientH * deviceRatio);
                        }
                    }
                }

                // Luôn bảo vệ tỉ lệ chuẩn trong giới hạn màn hình thực tế (TRIỆT TIÊU 100% VIỀN ĐEN)
                if (targetClientH > maxClientH) {
                    targetClientH = maxClientH;
                    targetClientW = (int)Math.Round(targetClientH * deviceRatio);
                }
                if (targetClientW > maxClientW) {
                    targetClientW = maxClientW;
                    targetClientH = (int)Math.Round(targetClientW / deviceRatio);
                }

                // Bảo vệ giới hạn tối thiểu
                int minClientW = 160;
                int minClientH = (int)Math.Round(minClientW / deviceRatio);
                if (targetClientW < minClientW) {
                    targetClientW = minClientW;
                    targetClientH = minClientH;
                }
            }

            if (targetClientW <= 0 || targetClientH <= 0) return;

            int newWinW = targetClientW + borderW;
            int newWinH = targetClientH + borderH;

            int newLeft = wr.Left;
            int newTop  = wr.Top;

            // Khi xoay màn hình, đảm bảo cửa sổ không bị tràn ra ngoài màn hình
            if (orientationChanged) {
                if (newLeft + newWinW > workArea.Right) {
                    newLeft = Math.Max(workArea.Left, workArea.Right - newWinW);
                }
                if (newTop + newWinH > workArea.Bottom) {
                    newTop = Math.Max(workArea.Top, workArea.Bottom - newWinH);
                }
                if (newLeft < workArea.Left) {
                    newLeft = workArea.Left;
                }
                if (newTop < workArea.Top) {
                    newTop = workArea.Top;
                }
            } else if (targetClientH > lastClientH && lastClientH > 0) {
                // CHỈ KHI KÉO TO RA mà bị cấn Taskbar ở dưới thì mới tự đẩy Top lên trên
                if (newTop + newWinH > workArea.Bottom && newTop > workArea.Top) {
                    newTop = Math.Max(workArea.Top, workArea.Bottom - newWinH);
                }
            }

            lastClientW = targetClientW;
            lastClientH = targetClientH;

            Log(string.Format("Snap: Client {0}x{1} → {2}x{3}, Win {4}x{5} → {6}x{7} (Pos: {8},{9}) (Ratio={10:F4})",
                clientW, clientH, targetClientW, targetClientH, winW, winH, newWinW, newWinH, newLeft, newTop, deviceRatio));

            SetWindowPos(hwnd, IntPtr.Zero, newLeft, newTop, newWinW, newWinH,
                SWP_NOZORDER | SWP_NOACTIVATE);
        }

        static void Log(string msg) {
            try { File.AppendAllText(logFile, "[" + DateTime.Now.ToString("HH:mm:ss.fff") + "] " + msg + "\r\n"); } catch { }
        }
    }
}
