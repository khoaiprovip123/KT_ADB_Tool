import { describe, it, expect, vi } from "vitest";
import { getDeviceInfo } from "../../src/main/core/deviceInfoService";
import { adbState } from "../../src/main/core/adbCore";
import { Readable } from "stream";

vi.mock("../../src/main/core/adbCore", () => {
  return {
    adbState: {
      client: {
        shell: vi.fn(),
        listDevices: vi.fn(() => Promise.resolve([{ id: "test-device", type: "device" }])),
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

describe("deviceInfoService - getDeviceInfo", () => {
  it("should split friendly name by pipe and display clean codename", async () => {
    vi.mocked(adbState.client.shell).mockImplementation((_deviceId, cmd) => {
      if (cmd === "getprop") {
        return Promise.resolve(
          createMockStream(
            `[ro.product.brand]: [Xiaomi]\n[ro.build.product]: [lisa]\n[ro.product.model]: [2109119DG]\n`,
          ),
        ) as any;
      }
      return Promise.resolve(createMockStream("")) as any;
    });

    const info = await getDeviceInfo("test-device");
    expect(info).not.toBeNull();
    expect(info?.codename).toBe("lisa (Mi 11 LE)");
    expect(info?.model).toBe("Mi 11 LE");
  });

  it("should parse RAM information from /proc/meminfo correctly", async () => {
    vi.mocked(adbState.client.shell).mockImplementation((_deviceId, cmd) => {
      if (cmd === "getprop") {
        return Promise.resolve(
          createMockStream(
            `[ro.product.brand]: [Xiaomi]\n[ro.build.product]: [lisa]\n[ro.product.model]: [2109119DG]\n`,
          ),
        ) as any;
      }
      if (cmd === "cat /proc/meminfo") {
        return Promise.resolve(
          createMockStream(
            `MemTotal:        3934336 kB\nMemFree:          123456 kB\nMemAvailable:    1900000 kB\n`,
          ),
        ) as any;
      }
      return Promise.resolve(createMockStream("")) as any;
    });

    const info = await getDeviceInfo("test-device");
    expect(info).not.toBeNull();
    expect(info?.ramTotal).toBe(3842); // 3934336 / 1024 = 3842.125 -> round to 3842
    expect(info?.ramFree).toBe(1855); // 1900000 / 1024 = 1855.46 -> round to 1855
  });

  it("should prioritize ro.boot.device over port ROM build.product (e.g. lisa over missi)", async () => {
    vi.mocked(adbState.client.shell).mockImplementation((_deviceId, cmd) => {
      if (cmd === "getprop") {
        return Promise.resolve(
          createMockStream(
            `[ro.product.brand]: [Xiaomi]\n[ro.boot.device]: [lisa]\n[ro.build.product]: [missi]\n[ro.product.device]: [missi]\n[ro.product.model]: [2109119DG]\n`,
          ),
        ) as any;
      }
      return Promise.resolve(createMockStream("")) as any;
    });

    const info = await getDeviceInfo("test-device");
    expect(info).not.toBeNull();
    expect(info?.codename).toBe("lisa (Mi 11 LE)");
  });

  it("should strip region suffix like lisa_global to match lisa", async () => {
    vi.mocked(adbState.client.shell).mockImplementation((_deviceId, cmd) => {
      if (cmd === "getprop") {
        return Promise.resolve(
          createMockStream(
            `[ro.product.brand]: [Xiaomi]\n[ro.product.mod_device]: [lisa_global]\n[ro.product.model]: [2109119DG]\n`,
          ),
        ) as any;
      }
      return Promise.resolve(createMockStream("")) as any;
    });

    const info = await getDeviceInfo("test-device");
    expect(info).not.toBeNull();
    expect(info?.codename).toBe("lisa (Mi 11 LE)");
  });
});
