// ScrcpyContainer.cs — Quản lý lifecycle scrcpy và tự động snap aspect ratio chuẩn xác (trừ hao Non-Client Area)
// Hỗ trợ tự động căn chỉnh khi đổi hướng xoay màn hình (Portrait <-> Landscape)
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
        [DllImport("user32.dll")] static extern bool   GetWindowRect(IntPtr hWnd, out RECT lpRect);
        [DllImport("user32.dll")] static extern bool   GetClientRect(IntPtr hWnd, out RECT lpRect);
        [DllImport("user32.dll")] static extern bool   SetWindowPos(IntPtr hWnd, IntPtr ins, int x, int y, int cx, int cy, uint f);
        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        static extern bool SetWindowText(IntPtr hWnd, string lpString);

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
        const uint SWP_NOZORDER             = 0x0004;
        const uint SWP_NOACTIVATE           = 0x0010;

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

        // Delegate ref để tránh GC
        static WinEventDelegate winEvDelegate;

        // ============================================================
        // Main
        // ============================================================
        [STAThread]
        static void Main(string[] args) {
            SetProcessDPIAware();
            // Lưu log ở thư mục Temp để tránh lỗi quyền ghi khi cài vào C:\Program Files
            logFile = Path.Combine(Path.GetTempPath(), "scrcpy_container.log");
            try { File.WriteAllText(logFile, ""); } catch { }
            Log("=== ScrcpyHelper Start (perfect client aspect-ratio snap) ===");

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
                        bool wasLandscape = (texW > texH);
                        bool isLandscape = (w > h);
                        bool orientChanged = (texW > 0 && texH > 0 && wasLandscape != isLandscape);

                        texW = w; texH = h;
                        deviceRatio = (double)w / h;
                        Log(string.Format("Texture={0}x{1} ratio={2:F6} orientChanged={3}", w, h, deviceRatio, orientChanged));

                        if (scrcpyHwnd != IntPtr.Zero) {
                            if (orientChanged) {
                                // Tự động snap lại cửa sổ khi xoay màn hình
                                ThreadPool.QueueUserWorkItem((_) => {
                                    Thread.Sleep(150);
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
                        SetWindowText(h, displayTitle);
                        Log("Title set: " + displayTitle);
                        // Căn chỉnh ngay khi tìm thấy cửa sổ để khớp Client Area hoàn hảo
                        SnapWindow(h, false);
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
        // WinEvent: EVENT_SYSTEM_MOVESIZEEND
        // ============================================================
        static void WinEvCallback(IntPtr hHook, uint ev, IntPtr hwnd,
                                   int idObj, int idChild, uint idThread, uint ms) {
            if (hwnd == IntPtr.Zero || hwnd != scrcpyHwnd) return;
            SnapWindow(hwnd, false);
        }

        // ============================================================
        // SnapWindow: Căn chỉnh Aspect Ratio dựa trên CLIENT AREA
        // Triệt tiêu hoàn toàn viền đen (pillarbox / letterbox)
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

            if (winW <= 0 || winH <= 0 || clientW <= 0 || clientH <= 0) return;

            // Tính chính xác phần viền không thuộc Client (Title Bar, viền DWM trái/phải/dưới)
            int borderW = winW - clientW;
            int borderH = winH - clientH;

            Screen screen = Screen.FromHandle(hwnd);
            System.Drawing.Rectangle workArea = (screen != null) ? screen.WorkingArea : Screen.PrimaryScreen.WorkingArea;
            int maxClientW = Math.Max(200, workArea.Width - borderW - 16);
            int maxClientH = Math.Max(200, workArea.Height - borderH - 16);

            int targetClientW = clientW;
            int targetClientH = clientH;

            bool isLandscape = (texW > texH);

            if (orientationChanged) {
                // Tự động căn chỉnh kích thước tối ưu khi đổi hướng Portrait <-> Landscape
                if (isLandscape) {
                    // Landscape: Ưu tiên chiều cao khoảng 55% màn hình (tối đa 600px)
                    targetClientH = Math.Min(580, (int)(workArea.Height * 0.55));
                    targetClientW = (int)Math.Round(targetClientH * deviceRatio);
                    if (targetClientW > maxClientW) {
                        targetClientW = maxClientW;
                        targetClientH = (int)Math.Round(targetClientW / deviceRatio);
                    }
                } else {
                    // Portrait: Ưu tiên chiều cao khoảng 75% màn hình (tối đa 850px)
                    targetClientH = Math.Min(850, (int)(workArea.Height * 0.75));
                    targetClientW = (int)Math.Round(targetClientH * deviceRatio);
                    if (targetClientH > maxClientH) {
                        targetClientH = maxClientH;
                        targetClientW = (int)Math.Round(targetClientH * deviceRatio);
                    }
                }
            } else {
                // User kéo resize cửa sổ thủ công:
                double currentRatio = (double)clientW / clientH;
                double diff = Math.Abs(currentRatio - deviceRatio) / deviceRatio;
                if (diff < 0.005) {
                    lastClientW = clientW;
                    lastClientH = clientH;
                    return; // Đã lệch < 0.5%, không cần can thiệp
                }

                int deltaW = Math.Abs(clientW - lastClientW);
                int deltaH = Math.Abs(clientH - lastClientH);

                if (isLandscape) {
                    if (deltaW > deltaH * 1.5) {
                        // User chủ động kéo rộng cạnh bên: giữ clientW, chỉnh clientH
                        targetClientW = clientW;
                        targetClientH = (int)Math.Round(targetClientW / deviceRatio);
                    } else {
                        // Mặc định landscape: giữ clientH, tính clientW
                        targetClientH = clientH;
                        targetClientW = (int)Math.Round(targetClientH * deviceRatio);
                    }
                } else {
                    if (deltaW > deltaH * 1.5) {
                        // User chủ động kéo rộng cạnh bên
                        targetClientW = clientW;
                        targetClientH = (int)Math.Round(targetClientW / deviceRatio);
                    } else {
                        // Mặc định portrait: giữ clientH, tính clientW
                        targetClientH = clientH;
                        targetClientW = (int)Math.Round(targetClientH * deviceRatio);
                    }
                }

                // Bảo vệ không tràn màn hình
                if (targetClientW > maxClientW) {
                    targetClientW = maxClientW;
                    targetClientH = (int)Math.Round(targetClientW / deviceRatio);
                }
                if (targetClientH > maxClientH) {
                    targetClientH = maxClientH;
                    targetClientW = (int)Math.Round(targetClientH * deviceRatio);
                }
            }

            if (targetClientW <= 0 || targetClientH <= 0) return;

            int newWinW = targetClientW + borderW;
            int newWinH = targetClientH + borderH;

            // Giữ cửa sổ nằm trọn trong vùng làm việc của màn hình
            int newLeft = wr.Left;
            int newTop  = wr.Top;
            if (newLeft + newWinW > workArea.Right)  newLeft = Math.Max(workArea.Left, workArea.Right - newWinW);
            if (newTop  + newWinH > workArea.Bottom) newTop  = Math.Max(workArea.Top,  workArea.Bottom - newWinH);

            lastClientW = targetClientW;
            lastClientH = targetClientH;

            Log(string.Format("Snap: Client {0}x{1} → {2}x{3}, Win {4}x{5} → {6}x{7} (Ratio={8:F4})",
                clientW, clientH, targetClientW, targetClientH, winW, winH, newWinW, newWinH, deviceRatio));

            SetWindowPos(hwnd, IntPtr.Zero, newLeft, newTop, newWinW, newWinH,
                SWP_NOZORDER | SWP_NOACTIVATE);
        }

        static void Log(string msg) {
            try { File.AppendAllText(logFile, "[" + DateTime.Now.ToString("HH:mm:ss.fff") + "] " + msg + "\r\n"); } catch { }
        }
    }
}
