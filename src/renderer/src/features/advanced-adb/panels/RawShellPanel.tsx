import React, { useRef, useEffect } from "react";
import { Terminal, Lock, Maximize2, Minimize2 } from "lucide-react";

interface RawShellPanelProps {
  shellInput: string;
  setShellInput: (input: string) => void;
  shellLogs: Array<{ type: "input" | "output" | "error" | "system"; text: string }>;
  setShellLogs: (logs: any) => void;
  rawShellUnlocked: boolean;
  slideValue: number;
  isShellTerminalMaximized: boolean;
  setIsShellTerminalMaximized: (max: boolean) => void;
  handleShellSubmit: (e: React.FormEvent) => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleSlideChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSlideEnd: () => void;
}

export function RawShellPanel({
  shellInput,
  setShellInput,
  shellLogs,
  setShellLogs,
  rawShellUnlocked,
  slideValue,
  isShellTerminalMaximized,
  setIsShellTerminalMaximized,
  handleShellSubmit,
  handleKeyDown,
  handleSlideChange,
  handleSlideEnd,
}: RawShellPanelProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [shellLogs]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {!rawShellUnlocked ? (
        /* LOCK SCREEN WITH SLIDER */
        <div className="absolute inset-0 bg-slate-950/[0.97] rounded-[24px] flex flex-col items-center justify-center p-6 text-center z-30 select-none overflow-hidden">
          {/* CRT scanline effects */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none z-10 opacity-60"></div>
          <div
            className="absolute inset-0 bg-rose-900/10 pointer-events-none z-10"
            style={{ animation: "warning-red-glow 4s infinite" }}
          ></div>

          <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-[24px] flex items-center justify-center mb-6 relative shadow-lg shadow-rose-950/20">
            <Lock className="w-9 h-9" />
          </div>

          <h3 className="text-lg font-black text-rose-500 tracking-wider uppercase mb-2">
            RAW SHELL IS LOCKED
          </h3>
          <p className="text-xs text-slate-400 font-semibold max-w-sm leading-relaxed mb-8">
            CẢNH BÁO: Raw Shell cho phép chạy các lệnh ADB thô không có bộ lọc an toàn.
            Chạy sai lệnh có thể gây brick thiết bị hoặc mất dữ liệu hoàn toàn.
          </p>

          {/* Slider unlock bar */}
          <div className="relative w-64 h-12 bg-slate-900 border border-white/5 rounded-full flex items-center justify-center shadow-inner group">
            <span className="absolute text-[10px] font-black text-slate-500 uppercase tracking-widest pointer-events-none transition-opacity group-hover:text-slate-400">
              Trượt để mở khóa Shell
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={slideValue}
              onChange={handleSlideChange}
              onMouseUp={handleSlideEnd}
              onTouchEnd={handleSlideEnd}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />
            {/* Slider knob preview */}
            <div
              className="absolute left-1 top-1 bottom-1 bg-rose-600 rounded-full flex items-center justify-center shadow-md shadow-rose-900/20 transition-all pointer-events-none z-10"
              style={{
                width: "40px",
                transform: `translateX(${(slideValue / 100) * (256 - 48)}px)`,
              }}
            >
              <Terminal className="w-4.5 h-4.5 text-white" />
            </div>
          </div>
        </div>
      ) : null}

      {/* TERMINAL EMULATOR */}
      <div className="flex-1 flex flex-col bg-slate-950 border border-white/5 rounded-[24px] shadow-2xl relative overflow-hidden h-full z-20">
        {/* CRT Scanline */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none z-10 opacity-70"></div>
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: "radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.4) 100%)",
          }}
        ></div>

        {/* Terminal Header */}
        <div className="bg-slate-900 border-b border-white/5 px-4 py-3 flex items-center justify-between shrink-0 select-none z-20">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
              Raw ADB Interactive Shell
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShellLogs([])}
              className="px-2 py-0.5 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white rounded text-[8px] font-black uppercase tracking-wider transition-colors"
            >
              Clear Console
            </button>
            <button
              onClick={() => setIsShellTerminalMaximized(!isShellTerminalMaximized)}
              className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              {isShellTerminalMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Console logs */}
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-2.5 z-20 min-h-0 select-all">
          {shellLogs.length === 0 ? (
            <div className="text-slate-600 font-semibold select-none">
              # Sẵn sàng chạy lệnh. Mọi output sẽ xuất hiện tại đây...
            </div>
          ) : (
            shellLogs.map((log, idx) => (
              <div
                key={idx}
                className={`font-mono leading-relaxed whitespace-pre-wrap break-all ${
                  log.type === "input"
                    ? "text-emerald-400 font-extrabold"
                    : log.type === "error"
                      ? "text-rose-500"
                      : log.type === "system"
                        ? "text-amber-500"
                        : "text-slate-200"
                }`}
              >
                {log.text}
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Terminal Input Box */}
        <form
          onSubmit={handleShellSubmit}
          className="border-t border-white/5 bg-slate-900/60 p-3 flex items-center gap-3.5 shrink-0 z-20"
        >
          <span className="font-mono text-xs font-black text-rose-500 select-none pl-1">
            $
          </span>
          <input
            type="text"
            value={shellInput}
            onChange={(e) => setShellInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập lệnh adb shell của bạn (ví dụ: pm list packages, getprop...)"
            className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-rose-450 placeholder:text-rose-950 placeholder:opacity-50"
            autoFocus={rawShellUnlocked}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/25 hover:border-rose-600 hover:text-white rounded-xl text-rose-500 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shrink-0"
          >
            Chạy
          </button>
        </form>
      </div>
    </div>
  );
}
