// ScrcpyContainer.cs — Chỉ còn nhiệm vụ snap aspect ratio sau khi user thả chuột
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
        static string logFile    = "";
        static string serial     = "";
        static string scrcpyExe  = "";
        static string keyboardMode = "sdk";
        static bool   turnScreenOff = false;
        static string windowTitle = "";

        // Aspect ratio cập nhật ĐỘNG từ "Texture: WxH" stdout
        static double deviceRatio = 0.0;
        static int    texW = 0, texH = 0;

        static IntPtr scrcpyHwnd  = IntPtr.Zero;
        static Process scrcpyProc = null;
        static IntPtr hookWinEv   = IntPtr.Zero;

        // Delegate ref để tránh GC
        static WinEventDelegate winEvDelegate;

        // ============================================================
        // Main
        // ============================================================
        [STAThread]
        static void Main(string[] args) {
            SetProcessDPIAware();
            logFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "scrcpy_container.log");
            try { File.WriteAllText(logFile, ""); } catch { }
            Log("=== ScrcpyHelper Start (snap-only, no keyboard hook) ===");

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
                // --adb không cần nữa (không gửi broadcast)
            }
            Log(string.Format("serial={0} initRatio={1:F4} keyboard={2} title={3}", serial, deviceRatio, keyboardMode, windowTitle));
        }

        // ============================================================
        // Launch scrcpy native
        // --keyboard=sdk: input chuẩn Unicode, hỗ trợ Unikey/EVKey tiếng Việt
        // Không truyền --window-borderless: giữ title bar để user kéo/resize
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

            // Parse stdout "Texture: WxH" → cập nhật ratio động (xử lý xoay màn hình)
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
                        texW = w; texH = h;
                        deviceRatio = (double)w / h;
                        Log(string.Format("Texture={0}x{1} ratio={2:F6}", w, h, deviceRatio));
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
        // Snap window về đúng aspect ratio SAU KHI user thả chuột
        // Không can thiệp trong lúc đang kéo, không ảnh hưởng D3D render
        // ============================================================
        static void WinEvCallback(IntPtr hHook, uint ev, IntPtr hwnd,
                                   int idObj, int idChild, uint idThread, uint ms) {
            if (hwnd == IntPtr.Zero || hwnd != scrcpyHwnd) return;
            if (deviceRatio <= 0) return;

            RECT wr;
            if (!GetWindowRect(hwnd, out wr)) return;
            int winW = wr.Right  - wr.Left;
            int winH = wr.Bottom - wr.Top;
            if (winW <= 0 || winH <= 0) return;

            double currentRatio = (double)winW / winH;
            double diff = Math.Abs(currentRatio - deviceRatio) / deviceRatio;
            if (diff < 0.01) return; // Không cần snap nếu lệch < 1%

            int newW, newH;
            if (texH >= texW) {
                // Portrait: giữ height, tính width
                newH = winH;
                newW = (int)Math.Round(winH * deviceRatio);
            } else {
                // Landscape: giữ width, tính height
                newW = winW;
                newH = (int)Math.Round(winW / deviceRatio);
            }

            if (newW <= 0 || newH <= 0) return;
            Log(string.Format("Snap: {0}x{1} → {2}x{3} ratio={4:F4}", winW, winH, newW, newH, deviceRatio));
            SetWindowPos(hwnd, IntPtr.Zero, wr.Left, wr.Top, newW, newH,
                SWP_NOZORDER | SWP_NOACTIVATE);
        }

        static void Log(string msg) {
            try { File.AppendAllText(logFile, "[" + DateTime.Now.ToString("HH:mm:ss.fff") + "] " + msg + "\r\n"); } catch { }
        }
    }
}
