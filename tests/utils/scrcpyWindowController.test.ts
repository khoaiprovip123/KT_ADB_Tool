import { describe, it, expect, vi } from "vitest";
import {
  getDeviceAspectRatio,
  stopScrcpyWindowController,
  cleanupAllWindowControllers,
} from "../../src/main/core/scrcpyWindowController";
import { adbState } from "../../src/main/core/adbCore";
import { Readable } from "stream";

vi.mock("../../src/main/core/adbCore", () => {
  return {
    adbState: {
      client: {
        shell: vi.fn(),
      },
    },
  };
});

function createMockStream(content: string) {
  const stream = new Readable();
  stream.push(content);
  stream.push(null);
  return stream;
}

describe("scrcpyWindowController", () => {
  describe("getDeviceAspectRatio", () => {
    it("should correctly parse physical screen size from wm size", async () => {
      const mockOutput = "Physical size: 1080x2400\n";
      vi.mocked(adbState.client.shell).mockResolvedValue(createMockStream(mockOutput) as any);

      const res = await getDeviceAspectRatio("device-1");
      expect(res.width).toBe(1080);
      expect(res.height).toBe(2400);
      expect(res.aspectRatio).toBeCloseTo(1080 / 2400, 4);
    });

    it("should prioritize override size when available", async () => {
      const mockOutput = "Physical size: 1080x2400\nOverride size: 720x1600\n";
      vi.mocked(adbState.client.shell).mockResolvedValue(createMockStream(mockOutput) as any);

      const res = await getDeviceAspectRatio("device-1");
      expect(res.width).toBe(720);
      expect(res.height).toBe(1600);
      expect(res.aspectRatio).toBeCloseTo(720 / 1600, 4);
    });

    it("should fallback to 1080x2400 if wm size output is invalid", async () => {
      const mockOutput = "Random invalid output";
      vi.mocked(adbState.client.shell).mockResolvedValue(createMockStream(mockOutput) as any);

      const res = await getDeviceAspectRatio("device-1");
      expect(res.width).toBe(1080);
      expect(res.height).toBe(2400);
      expect(res.aspectRatio).toBeCloseTo(1080 / 2400, 4);
    });
  });

  describe("compatibility stubs", () => {
    it("stopScrcpyWindowController should not throw", () => {
      expect(() => stopScrcpyWindowController("device-1")).not.toThrow();
    });

    it("cleanupAllWindowControllers should not throw", () => {
      expect(() => cleanupAllWindowControllers()).not.toThrow();
    });
  });
});
