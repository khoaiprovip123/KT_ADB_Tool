import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listDirectory,
  createDirectory,
  deleteFile,
  renameFile,
} from "../../src/main/core/fileService";
import { adbState } from "../../src/main/core/adbCore";
import { Readable } from "stream";

vi.mock("../../src/main/core/adbCore", () => {
  return {
    adbState: {
      client: {
        readdir: vi.fn(),
        shell: vi.fn(),
      },
    },
    execAdb: vi.fn(),
  };
});

function createMockStream() {
  const stream = new Readable();
  stream.push(null);
  return stream;
}

describe("fileService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("listDirectory", () => {
    it("should successfully list directory using API readdir", async () => {
      const mockFiles = [
        { name: "file1.txt", size: 100, mtime: new Date(), mode: 0o100000 },
        { name: "dir1", size: 4096, mtime: new Date(), mode: 0o040000 },
      ];
      vi.mocked(adbState.client.readdir).mockResolvedValue(mockFiles);

      const files = await listDirectory("test-device", "/sdcard");
      expect(files).toHaveLength(2);
      expect(files[0].name).toBe("dir1"); // Directory first due to sorting
      expect(files[0].isDir).toBe(true);
      expect(files[1].name).toBe("file1.txt");
      expect(files[1].isFile).toBe(true);
    });

    it("should throw error for unsafe remote paths", async () => {
      await expect(listDirectory("test-device", "/some/unsafe/path; rm -rf /")).rejects.toThrow("Unsafe remote path");
    });
  });

  describe("createDirectory", () => {
    it("should call mkdir via shell and return true on success", async () => {
      const mockStream = createMockStream();
      vi.mocked(adbState.client.shell).mockResolvedValue(mockStream as any);

      // Simulate stream events
      setTimeout(() => {
        mockStream.emit("end");
      }, 10);

      const result = await createDirectory("test-device", "/sdcard/NewFolder");
      expect(result).toBe(true);
      expect(adbState.client.shell).toHaveBeenCalledWith(
        "test-device",
        "mkdir -p '/sdcard/NewFolder'",
      );
    });

    it("should return false and not call shell for unsafe paths", async () => {
      const result = await createDirectory("test-device", "/sdcard/NewFolder; rm -rf /");
      expect(result).toBe(false);
      expect(adbState.client.shell).not.toHaveBeenCalled();
    });
  });

  describe("deleteFile", () => {
    it("should call rm -rf via shell and return true on success", async () => {
      const mockStream = createMockStream();
      vi.mocked(adbState.client.shell).mockResolvedValue(mockStream as any);

      setTimeout(() => {
        mockStream.emit("end");
      }, 10);

      const result = await deleteFile("test-device", "/sdcard/file.txt");
      expect(result).toBe(true);
      expect(adbState.client.shell).toHaveBeenCalledWith(
        "test-device",
        "rm -rf '/sdcard/file.txt'",
      );
    });
  });

  describe("renameFile", () => {
    it("should call mv via shell and return true on success", async () => {
      const mockStream = createMockStream();
      vi.mocked(adbState.client.shell).mockResolvedValue(mockStream as any);

      setTimeout(() => {
        mockStream.emit("end");
      }, 10);

      const result = await renameFile("test-device", "/sdcard/old.txt", "/sdcard/new.txt");
      expect(result).toBe(true);
      expect(adbState.client.shell).toHaveBeenCalledWith(
        "test-device",
        "mv '/sdcard/old.txt' '/sdcard/new.txt'",
      );
    });
  });
});
