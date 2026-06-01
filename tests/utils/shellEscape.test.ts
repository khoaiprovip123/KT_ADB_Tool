import { describe, it, expect } from "vitest";
import { escapeShell } from "../../src/renderer/src/utils/validation";

describe("Shell Escaping Utility Tests", () => {
  it("should correctly escape standard package names", () => {
    expect(escapeShell("com.android.settings")).toBe("'com.android.settings'");
    expect(escapeShell("com.xiaomi.joyose")).toBe("'com.xiaomi.joyose'");
  });

  it("should escape single quotes safely to prevent command breakouts", () => {
    expect(escapeShell("com.package'name")).toBe("'com.package'\\''name'");
    expect(escapeShell("'; rm -rf /; '")).toBe("''\\''; rm -rf /; '\\'''");
  });
});
