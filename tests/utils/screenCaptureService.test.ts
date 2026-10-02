import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock electron modules
vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn((name: string) => `C:\\mock\\${name}`),
  },
  clipboard: {
    writeImage: vi.fn(),
  },
  nativeImage: {
    createFromBuffer: vi.fn(() => ({})),
  },
  shell: {
    openPath: vi.fn().mockResolvedValue(""),
  },
}));

// Mock child_process partially
vi.mock("child_process", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    spawn: vi.fn(() => ({
      stdout: {
        on: vi.fn((event: string, cb: Function) => {
          if (event === "data") {
            cb(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]));
          }
        }),
      },
      on: vi.fn((event: string, cb: Function) => {
        if (event === "close") {
          setTimeout(() => cb(0), 10);
        }
      }),
      kill: vi.fn(),
    })),
  };
});

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
}));

import {
  captureDeviceScreenshot,
  startDeviceRecording,
  stopDeviceRecording,
  isScreenRecording,
  openCaptureFolder,
} from "../../src/main/core/screenCaptureService";

describe("screenCaptureService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should capture screenshot and copy to clipboard", async () => {
    const res = await captureDeviceScreenshot("device123");
    expect(res.success).toBe(true);
    expect(res.filePath).toBeDefined();
    expect(res.filePath).toContain("Screenshot_");
  });

  it("should start screen recording session", async () => {
    const res = await startDeviceRecording("device_record_test");
    expect(res.success).toBe(true);
    expect(isScreenRecording("device_record_test")).toBe(true);
  });

  it("should prevent duplicate screen recording for same device", async () => {
    const res = await startDeviceRecording("device_record_test");
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("should stop screen recording and return local file path", async () => {
    const res = await stopDeviceRecording("device_record_test");
    expect(res.success).toBe(true);
    expect(res.filePath).toBeDefined();
    expect(isScreenRecording("device_record_test")).toBe(false);
  });

  it("should open capture folders", async () => {
    const resScreenshots = await openCaptureFolder("screenshots");
    expect(resScreenshots).toBe(true);

    const resVideos = await openCaptureFolder("videos");
    expect(resVideos).toBe(true);
  });
});
