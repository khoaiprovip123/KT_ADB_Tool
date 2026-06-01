import { useState, useCallback } from "react";
import { AppInfo } from "../types";
import { BLACKLIST, BLOATWARE_PRESETS } from "../constants";

export function useAppSelection(
  packages: AppInfo[],
  filteredPackages: AppInfo[],
) {
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((pkg: string) => {
    if (BLACKLIST.includes(pkg)) return;
    setSelectedApps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pkg)) newSet.delete(pkg);
      else newSet.add(pkg);
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    const selectable = filteredPackages.filter(
      (app) => !BLACKLIST.includes(app.pkg),
    );
    setSelectedApps((prev) => {
      if (prev.size === selectable.length && selectable.length > 0) {
        return new Set();
      } else {
        return new Set(selectable.map((a) => a.pkg));
      }
    });
  }, [filteredPackages]);

  const clearSelection = useCallback(() => {
    setSelectedApps(new Set());
  }, []);

  const applyPresetSelection = useCallback(
    (presetKey: string) => {
      if (presetKey !== "none") {
        const presetList =
          BLOATWARE_PRESETS[presetKey as keyof typeof BLOATWARE_PRESETS] || [];
        const toSelect = packages.filter((app) => presetList.includes(app.pkg));
        setSelectedApps(new Set(toSelect.map((app) => app.pkg)));
      } else {
        setSelectedApps(new Set());
      }
    },
    [packages],
  );

  const selectableCount = filteredPackages.filter(
    (app) => !BLACKLIST.includes(app.pkg),
  ).length;
  const allSelected =
    selectedApps.size === selectableCount && selectableCount > 0;

  return {
    selectedApps,
    setSelectedApps,
    toggleSelect,
    selectAll,
    clearSelection,
    applyPresetSelection,
    allSelected,
  };
}
