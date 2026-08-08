import { ipcMain } from "electron";
import { advancedAdbService } from "../core/advancedAdbService";
import { ADVANCED_COMMANDS } from "../core/advancedCommandRegistry";
import {
  assertValidSettingsNamespace,
  assertValidShellCommand,
  isValidDeviceId,
} from "./validate";

export function registerAdvancedAdbHandlers() {
  ipcMain.handle("advanced-adb:get-command-catalog", () => ADVANCED_COMMANDS);

  ipcMain.handle("advanced-adb:get-props", async (_event, deviceId: string) => {
    if (!isValidDeviceId(deviceId)) return [];
    try {
      return await advancedAdbService.getProps(deviceId);
    } catch (error: any) {
      return { error: error.message };
    }
  });

  ipcMain.handle(
    "advanced-adb:get-settings",
    async (_event, deviceId: string, namespace: string) => {
      if (!isValidDeviceId(deviceId)) return [];
      try {
        assertValidSettingsNamespace(namespace);
        return await advancedAdbService.getSettingsList(deviceId, namespace);
      } catch (error: any) {
        return { error: error.message };
      }
    },
  );

  ipcMain.handle(
    "advanced-adb:get-dumpsys",
    async (_event, deviceId: string, service: string) => {
      if (!isValidDeviceId(deviceId)) return "";
      try {
        return await advancedAdbService.getDumpsys(deviceId, service);
      } catch (error: any) {
        return error.message;
      }
    },
  );

  ipcMain.handle(
    "advanced-adb:execute-preset",
    async (
      _event,
      deviceId: string,
      commandId: string,
      params: Record<string, string | number>,
      action: "read" | "apply" | "rollback",
    ) => {
      if (!isValidDeviceId(deviceId)) {
        return { success: false, output: "Invalid deviceId" };
      }
      if (!["read", "apply", "rollback"].includes(action)) {
        return { success: false, output: "Invalid preset action" };
      }
      try {
        return await advancedAdbService.executePresetCommand(
          deviceId,
          commandId,
          params,
          action,
        );
      } catch (error: any) {
        return { success: false, output: error.message };
      }
    },
  );

  ipcMain.handle(
    "advanced-adb:execute-raw",
    async (_event, deviceId: string, command: string) => {
      if (!isValidDeviceId(deviceId)) {
        return { success: false, output: "Invalid deviceId" };
      }
      try {
        assertValidShellCommand(command);
        return await advancedAdbService.executeRawShell(deviceId, command);
      } catch (error: any) {
        return { success: false, output: error.message };
      }
    },
  );
}
