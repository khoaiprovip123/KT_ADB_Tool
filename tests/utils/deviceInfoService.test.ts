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
});
