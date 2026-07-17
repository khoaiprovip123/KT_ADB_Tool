# Tasks: Optimize RAM Query

**Input**: Design documents from `/specs/002-optimize-ram-query/`

**Prerequisites**: plan.md (required), spec.md (required)

## Phase 1: Implementation

- [x] T001 Replace dumpsys meminfo query with cat /proc/meminfo in `src/main/core/deviceInfoService.ts`
- [x] T002 Implement parser regex for MemTotal, MemAvailable and MemFree in `src/main/core/deviceInfoService.ts`
- [x] T003 Update mock and write unit tests verifying the new parse logic in `tests/utils/deviceInfoService.test.ts`

## Phase 2: Verification

- [x] T004 Run unit tests for deviceInfoService to ensure all tests pass
