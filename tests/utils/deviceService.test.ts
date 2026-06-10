import { describe, it, expect, vi } from "vitest";
import { getStorageStats } from "../../src/main/core/deviceService";
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

describe("deviceService - getStorageStats", () => {
  it("should parse normal df output successfully using parsed free value", async () => {
    const mockOutput = `Filesystem           1K-blocks      Used Available Use% Mounted on\n/dev/block/dm-5       50000000  10000000  40000000  20% /data\n`;
    vi.mocked(adbState.client.shell).mockResolvedValue(createMockStream(mockOutput) as any);

    const stats = await getStorageStats("test-device");
    expect(stats).not.toBeNull();
    expect(stats?.total).toBe(50000000 * 1024);
    expect(stats?.used).toBe(10000000 * 1024);
    expect(stats?.free).toBe(40000000 * 1024); // must use the parsed free value
    expect(stats?.percentage).toBe(20);
  });

  it("should fallback to total - used if parsed free value is NaN", async () => {
    const mockOutput = `Filesystem           1K-blocks      Used Available Use% Mounted on\n/dev/block/dm-5       50000000  10000000  invalid_free  20% /data\n`;
    vi.mocked(adbState.client.shell).mockResolvedValue(createMockStream(mockOutput) as any);

    const stats = await getStorageStats("test-device");
    expect(stats).not.toBeNull();
    expect(stats?.total).toBe(50000000 * 1024);
    expect(stats?.used).toBe(10000000 * 1024);
    expect(stats?.free).toBe((50000000 - 10000000) * 1024); // falls back to total - used
    expect(stats?.percentage).toBe(20);
  });

  it("should return null if df output is invalid or doesn't match", async () => {
    const mockOutput = `Filesystem           1K-blocks      Used Available Use% Mounted on\n`;
    vi.mocked(adbState.client.shell).mockResolvedValue(createMockStream(mockOutput) as any);

    const stats = await getStorageStats("test-device");
    expect(stats).toBeNull();
  });
});
