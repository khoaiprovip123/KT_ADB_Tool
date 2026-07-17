# Tasks: FileManager

**Input**: Design documents from `/specs/001-file-manager/`

**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup & Foundational

- [x] T001 Initialize FileManager project structure and settings
- [x] T002 Configure Electron IPC bridge in `src/preload/index.ts`
- [x] T003 Implement Android ADB core interactions in `src/main/core/fileService.ts`

## Phase 2: User Story 1 - Duyệt và điều hướng thư mục

- [x] T004 Implement IPC handlers for listing storage points and directory contents in `src/main/ipc/fileHandlers.ts`
- [x] T005 Create React UI for browsing files and folders in `src/renderer/src/components/features/FileManager.tsx`
- [x] T006 Implement history navigation (back, forward, up) in `src/renderer/src/components/features/FileManager.tsx`

## Phase 3: User Story 2 - Quản lý file (Upload, Download, New Folder, Delete)

- [x] T007 Implement upload and download (push/pull) IPC handlers in `src/main/ipc/fileHandlers.ts`
- [x] T008 Implement directory creation and delete IPC handlers in `src/main/ipc/fileHandlers.ts`
- [x] T009 Create UI elements and trigger functions in React UI (`FileManager.tsx`) for management actions

## Phase 4: User Story 3 - Xem trước hình ảnh

- [x] T010 Implement IPC handler for reading image file base64 content in `src/main/ipc/fileHandlers.ts`
- [x] T011 Create image preview modal with zoom controls in `FileManager.tsx`

## Phase 5: User Story 4 - Tìm kiếm và phân trang

- [x] T012 Add Client-side search logic in `FileManager.tsx`
- [x] T013 Implement pagination controls in `FileManager.tsx`

## Phase 6: Polish & Tests

- [x] T014 Create Unit Tests for ADB file operations in `tests/utils/fileService.test.ts`
- [x] T015 Verify error handling for permission denied and device disconnected states in `FileManager.tsx`

---

## Phase 7: Convergence

- [x] T016 Add search input to toolbar and wire up `setSearchQuery` in `src/renderer/src/components/features/FileManager.tsx` per FR-009 (partial)
- [x] T017 Implement unit tests for file service at `tests/utils/fileService.test.ts` per FR-002 (missing)

