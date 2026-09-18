import { describe, it, expect } from "vitest";
import {
  filterOutGitLinks,
  extractChangelogFromMarkdown,
} from "../../src/main/core/updateService";

describe("updateService changelog helpers", () => {
  it("filterOutGitLinks removes Full Changelog and compare links", () => {
    const raw = `
### Tính năng mới
- Tích hợp System Tray

**Full Changelog**: https://github.com/khoaiprovip123/KT_ADB_Tool/compare/v2.5.14...v2.5.15

**Full Changelog**:
https://github.com/khoaiprovip123/KT_ADB_Tool/compare/v2.5.14...v2.5.15
    `;

    const cleaned = filterOutGitLinks(raw);
    expect(cleaned).toContain("### Tính năng mới");
    expect(cleaned).toContain("- Tích hợp System Tray");
    expect(cleaned).not.toContain("Full Changelog");
    expect(cleaned).not.toContain("https://github.com/khoaiprovip123/KT_ADB_Tool/compare");
  });

  it("extractChangelogFromMarkdown extracts matching version section correctly", () => {
    const md = `
# Changelog

## [2.5.15] - 2026-09-18
### Tính năng mới
- System tray support

## [2.5.14] - 2026-09-16
### Sửa lỗi
- Move window fix
    `;

    const extracted = extractChangelogFromMarkdown(md, "2.5.15");
    expect(extracted).toContain("### Tính năng mới");
    expect(extracted).toContain("- System tray support");
    expect(extracted).not.toContain("## [2.5.14]");
    expect(extracted).not.toContain("Move window fix");
  });

  it("extractChangelogFromMarkdown falls back to first version block if target not matched", () => {
    const md = `
# Changelog

## [2.5.15] - 2026-09-18
- Feature latest

## [2.5.14] - 2026-09-16
- Feature old
    `;

    const extracted = extractChangelogFromMarkdown(md, "9.9.9");
    expect(extracted).toContain("- Feature latest");
    expect(extracted).not.toContain("- Feature old");
  });
});
