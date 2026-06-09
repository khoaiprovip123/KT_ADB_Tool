import { describe, expect, it } from "vitest";
import {
  assertValidAppAction,
  assertValidDebloatAction,
  assertValidDeviceId,
  assertValidDpi,
  assertValidLocalPath,
  assertValidPackageName,
  assertValidRemotePath,
  assertValidResolution,
  assertValidSettingsNamespace,
  shellQuote,
} from "../../src/main/ipc/validate";

describe("main IPC validation", () => {
  it("accepts valid boundary values", () => {
    expect(() => assertValidDeviceId("ABC123._:-")).not.toThrow();
    expect(() => assertValidPackageName("com.example.my_app")).not.toThrow();
    expect(() => assertValidRemotePath("/sdcard/Download/test file.apk")).not.toThrow();
    expect(() => assertValidLocalPath("D:\\Downloads\\app.apk")).not.toThrow();
    expect(() => assertValidSettingsNamespace("global")).not.toThrow();
    expect(() => assertValidAppAction("disable")).not.toThrow();
    expect(() => assertValidDebloatAction("restore")).not.toThrow();
    expect(() => assertValidDpi(440)).not.toThrow();
    expect(() => assertValidResolution(1080, 2400)).not.toThrow();
  });

  it("rejects shell injection attempts", () => {
    expect(() => assertValidPackageName("com.example.app; reboot")).toThrow();
    expect(() => assertValidRemotePath('/sdcard/Download/file"; reboot; "')).toThrow();
    expect(() => assertValidRemotePath("/sdcard/Download/$(id)")).toThrow();
    expect(() => assertValidLocalPath("D:\\Downloads\\app.apk&calc")).toThrow();
    expect(() => assertValidDeviceId("serial;reboot")).toThrow();
  });

  it("rejects remote paths outside user-accessible storage", () => {
    expect(() => assertValidRemotePath("/")).toThrow();
    expect(() => assertValidRemotePath("/system/build.prop")).toThrow();
    expect(() => assertValidRemotePath("/data/data/com.example.app")).toThrow();
    expect(() => assertValidRemotePath("/sdcard/Download/../../system")).toThrow();
  });

  it("rejects invalid enums and unsafe display values", () => {
    expect(() => assertValidSettingsNamespace("invalid")).toThrow();
    expect(() => assertValidAppAction("format")).toThrow();
    expect(() => assertValidDebloatAction("clear")).toThrow();
    expect(() => assertValidDpi(90)).toThrow();
    expect(() => assertValidResolution(100, 2400)).toThrow();
  });

  it("quotes validated shell arguments", () => {
    expect(shellQuote("/sdcard/Download/test file.apk")).toBe(
      "'/sdcard/Download/test file.apk'",
    );
  });
});
