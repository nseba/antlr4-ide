# PRD: Tabbed Editor, File Persistence & Version History

**Status:** Complete (All Tasks Done)

**Progress:**
- [x] Task 1.0: Backend File Persistence API - Complete
- [x] Task 2.0: Frontend File Service and State Migration - Complete (except localStorage migration)
- [x] Task 3.0: Tabbed Editor Interface Components - Complete (except file explorer indicators)
- [x] Task 4.0: Parse Tree to Editor Navigation - Complete
- [x] Task 5.0: Version History Backend API - Complete
- [x] Task 6.0: Version History UI Panel - Complete
- [x] Task 7.0: Docker Configuration for Persistent Storage - Complete
- [x] Task 8.0: Integration Testing and Final Polish - Complete (manual testing tasks remain for human verification)

## Introduction

This PRD covers three interconnected features that improve the ANTLR4 Lab Next user experience:

1. **Tabbed Editor Interface** - Allow multiple files to be open simultaneously with a tabbed interface, enabling quick switching between grammar and input files.

2. **Backend File Persistence** - Store project files on disk via the backend server instead of browser localStorage, with Docker volume mapping for data durability.

3. **Version History for AI Changes** - Maintain a linear history of file changes (especially AI-powered modifications) with the ability to rollback to previous versions.

### Problem Statement

Currently:
- Users can only view one file at a time, requiring constant navigation between grammar and input files
- Clicking on parse tree nodes doesn't automatically open the relevant file
- All files are stored in browser localStorage, which can be lost if browser data is cleared
- There's no way to undo AI-powered changes to grammar files beyond browser undo

## Goals

1. **G1**: Enable users to have unlimited files open simultaneously in tabs
2. **G2**: Auto-open and focus the grammar file when clicking parse tree rule nodes
3. **G3**: Persist all project files to the backend filesystem with Docker volume support
4. **G4**: Maintain unlimited linear version history for all files with rollback capability
5. **G5**: Create history checkpoints for AI changes and manual saves

## User Stories

### Tabbed Editor

**US1**: As a user, I want to open multiple files in tabs so that I can quickly switch between my grammar and input files without losing my place.

**US2**: As a user, I want to close individual tabs so that I can declutter my workspace when done with a file.

**US3**: As a user, I want unsaved changes indicated on tabs so that I know which files need saving.

**US4**: As a user, I want to click on a parse tree node and have the grammar file automatically open (if not already) and scroll to the rule definition so that I can understand how my input was parsed.

**US5**: As a user, I want my open tabs to be remembered so that when I return to the application, my workspace is restored.

### File Persistence

**US6**: As a user, I want my grammar and input files saved to the server so that I don't lose my work if I clear browser data or switch devices.

**US7**: As a user, I want files to auto-save so that I don't have to remember to save manually.

**US8**: As an administrator, I want project files stored in a Docker volume so that data persists across container restarts.

### Version History

**US9**: As a user, I want to see a history of changes to my files so that I can track how my grammar evolved.

**US10**: As a user, I want to rollback to a previous version of a file so that I can undo mistakes or unwanted AI changes.

**US11**: As a user, I want AI-powered changes to automatically create a history checkpoint so that I can always revert AI modifications.

**US12**: As a user, I want to manually create a checkpoint so that I can mark important milestones in my work.

## Functional Requirements

### 1. Tabbed Editor Interface

**FR1.1**: The editor area SHALL display a tab bar above the code editor showing all open files.

**FR1.2**: Each tab SHALL display:
- File name
- File type icon (grammar icon for .g4, text icon for .txt)
- Close button (X) on hover or when active
- Unsaved indicator (dot or asterisk) when file has unsaved changes

**FR1.3**: Clicking a tab SHALL switch the editor to display that file's content.

**FR1.4**: The tab bar SHALL support unlimited tabs with horizontal scrolling when tabs overflow.

**FR1.5**: Right-clicking a tab SHALL show a context menu with options:
- Close
- Close Others
- Close All
- Close to the Right

**FR1.6**: Double-clicking in empty tab bar area SHALL create a new file.

**FR1.7**: Tabs SHALL be reorderable via drag-and-drop.

**FR1.8**: The currently active tab SHALL be visually distinguished (highlighted background, border, or underline).

**FR1.9**: Closing a tab with unsaved changes SHALL prompt the user to save, discard, or cancel.

### 2. Parse Tree to Editor Navigation

**FR2.1**: When a user clicks a rule node in the parse tree, the system SHALL:
1. Check if the grammar file is already open in a tab
2. If not open, open it in a new tab
3. Switch focus to the grammar tab
4. Scroll to and highlight the rule definition line

**FR2.2**: The navigation SHALL work for both parser rules and lexer rules.

**FR2.3**: If the rule definition cannot be found, the system SHALL show a brief toast notification.

**FR2.4**: Token nodes (leaf nodes) SHALL continue to highlight text in the input file (existing behavior).

### 3. Backend File Persistence

**FR3.1**: The backend SHALL expose REST API endpoints for file operations:
- `GET /api/files` - List all files in the project
- `GET /api/files/:id` - Get file content
- `POST /api/files` - Create new file
- `PUT /api/files/:id` - Update file content
- `DELETE /api/files/:id` - Delete file

**FR3.2**: Files SHALL be stored in a configurable directory on the server filesystem (default: `./data/projects`).

**FR3.3**: Each file SHALL be stored with metadata in a JSON sidecar file or embedded header containing:
- File ID (UUID)
- File name
- File type (grammar/text)
- Created timestamp
- Modified timestamp

**FR3.4**: The frontend SHALL auto-save files to the backend after a 2-second debounce period following changes.

**FR3.5**: The frontend SHALL indicate save status:
- "Saving..." during save operation
- "Saved" with timestamp after successful save
- "Save failed" with retry option on error

**FR3.6**: On application load, the frontend SHALL fetch the file list from the backend and restore the workspace.

**FR3.7**: The system SHALL handle concurrent save operations gracefully (queue or debounce).

### 4. Docker Volume Configuration

**FR4.1**: The Dockerfile SHALL define a volume mount point at `/app/data`.

**FR4.2**: The docker-compose.yml SHALL map a named volume or host directory to `/app/data`.

**FR4.3**: The container SHALL run as a non-root user with appropriate permissions on the data directory.

**FR4.4**: Example docker-compose.yml configuration:
```yaml
volumes:
  - antlr4lab_data:/app/data
```

**FR4.5**: The backend SHALL create the data directory structure on first startup if it doesn't exist.

**FR4.6**: File permissions SHALL be set for single-user mode (container user owns all files).

### 5. Version History

**FR5.1**: The system SHALL maintain a linear version history for each file.

**FR5.2**: A new version SHALL be created when:
- AI makes changes to a file (automatic checkpoint)
- User explicitly clicks "Save Checkpoint" or uses keyboard shortcut
- User manually saves with Ctrl/Cmd+S (optional, configurable)

**FR5.3**: Each version entry SHALL contain:
- Version number (sequential integer)
- Timestamp
- File content (full snapshot)
- Change description (e.g., "AI refactoring", "Manual checkpoint", "Auto-save")
- Optional user-provided label

**FR5.4**: The history panel SHALL display:
- List of versions in reverse chronological order
- Version number, timestamp, and description for each
- Visual indicator for current version
- "Restore" button for each version

**FR5.5**: Restoring a version SHALL:
- Load the historical content into the editor
- Create a new version entry "Restored from version N"
- NOT delete any forward history (strictly linear, append-only)

**FR5.6**: Version history SHALL be stored in a separate file per source file:
- Format: `{fileId}.history.json`
- Location: Same data directory as source files

**FR5.7**: The history panel SHALL be accessible via:
- Tab in the bottom panel (alongside Console, Tokens, Analysis)
- Or a dedicated sidebar section

**FR5.8**: Users SHALL be able to view a diff between any two versions.

**FR5.9**: Version history SHALL be unlimited (no automatic pruning), but users may manually delete old versions.

### 6. Open Tabs Persistence

**FR6.1**: The list of open tabs and their order SHALL be persisted to the backend.

**FR6.2**: The active tab SHALL be remembered and restored on application load.

**FR6.3**: Tab state SHALL be stored in a workspace metadata file (e.g., `workspace.json`).

## Non-Goals (Out of Scope)

1. **Multi-user collaboration** - This is single-user; no conflict resolution needed
2. **Git integration** - Version history is internal only, not git-based
3. **Branching history** - History is strictly linear; rollback doesn't create branches
4. **File upload/download UI** - Files are managed through the editor only
5. **Multiple projects** - Single project per instance for now
6. **Split editor views** - Only one editor pane, multiple tabs
7. **Minimap or code folding** - Existing editor features unchanged

## Design Considerations

### Tab Bar UI

```
┌─────────────────────────────────────────────────────────────┐
│ [Expr.g4 ●] [input.txt] [Lexer.g4] [+]     │ ← Tab overflow scroll
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  (Editor Content)                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Active tab: Blue underline/border, brighter text
- Unsaved indicator: Orange dot before filename
- Close button: Appears on hover, always visible on active tab
- [+] button: Creates new file (shows type picker)

### History Panel UI

```
┌─────────────────────────────────────────────────────────────┐
│ Console │ Tokens │ Analysis │ History │                     │
├─────────────────────────────────────────────────────────────┤
│ ▶ Expr.g4 History                        [Save Checkpoint]  │
├─────────────────────────────────────────────────────────────┤
│ ● v5  Now           "AI: Optimized left-recursion"          │
│   v4  2 mins ago    "Manual checkpoint"                     │
│   v3  5 mins ago    "AI: Added error handling"              │
│   v2  10 mins ago   "Auto-save"                             │
│   v1  15 mins ago   "Initial version"                       │
│                                                             │
│                                [View Diff] [Restore]        │
└─────────────────────────────────────────────────────────────┘
```

## Technical Considerations

### Frontend Changes

1. **New Components**:
   - `TabBar.tsx` - Tab container with scroll handling
   - `Tab.tsx` - Individual tab component
   - `HistoryPanel.tsx` - Version history display
   - `DiffViewer.tsx` - Side-by-side or inline diff view

2. **State Management**:
   - Track `openTabs: string[]` (file IDs)
   - Track `activeTabId: string`
   - Remove localStorage persistence, replace with API calls

3. **API Client**:
   - Create `src/services/fileService.ts` for backend communication
   - Implement auto-save with debouncing
   - Handle offline/error states gracefully

### Backend Changes

1. **New Routes** (`server/routes/files.ts`):
   - CRUD operations for files
   - History retrieval and restore endpoints

2. **File Storage**:
   - Directory structure: `./data/projects/{fileId}.{ext}`
   - Metadata: `./data/projects/{fileId}.meta.json`
   - History: `./data/projects/{fileId}.history.json`
   - Workspace: `./data/workspace.json`

3. **Data Models**:
   ```typescript
   interface FileMetadata {
     id: string;
     name: string;
     type: 'grammar' | 'text';
     createdAt: string;
     modifiedAt: string;
   }

   interface VersionEntry {
     version: number;
     timestamp: string;
     content: string;
     description: string;
     label?: string;
   }

   interface FileHistory {
     fileId: string;
     versions: VersionEntry[];
   }

   interface WorkspaceState {
     openTabs: string[];
     activeTabId: string;
     settings: { startRule: string };
   }
   ```

### Docker Configuration

1. **Dockerfile additions**:
   ```dockerfile
   # Create data directory
   RUN mkdir -p /app/data && chown -R node:node /app/data

   # Define volume
   VOLUME /app/data
   ```

2. **docker-compose.yml**:
   ```yaml
   services:
     app:
       volumes:
         - antlr4lab_data:/app/data

   volumes:
     antlr4lab_data:
   ```

### Migration Path

1. On first load with existing localStorage data:
   - Detect localStorage files
   - Prompt user to migrate to backend storage
   - Import files via API
   - Clear localStorage after successful migration

## Success Metrics

| Metric | Target |
|--------|--------|
| Tab switch latency | < 50ms |
| Auto-save trigger time | 2 seconds after last change |
| Save operation latency | < 500ms for typical files |
| History restore latency | < 200ms |
| Docker volume persistence | 100% data retained across restarts |

## Open Questions

1. **Q1**: Should there be a visual indicator in the file explorer showing which files are open in tabs?
   - Proposed: Yes, subtle highlight or icon

2. **Q2**: Should auto-save create history entries or only explicit saves?
   - Proposed: Auto-save does NOT create history; only AI changes and manual checkpoints do

3. **Q3**: Should we support keyboard shortcuts for tab navigation (Ctrl+Tab, Ctrl+W)?
   - Proposed: Yes, standard IDE shortcuts

4. **Q4**: What happens to history when a file is deleted?
   - Proposed: History is also deleted; could offer "Archive" instead

5. **Q5**: Should the diff viewer support syntax highlighting?
   - Proposed: Yes, if time permits; otherwise plain text diff is acceptable for MVP

## Appendix: API Specification

### File Operations

```
GET /api/files
Response: { files: FileMetadata[] }

GET /api/files/:id
Response: { metadata: FileMetadata, content: string }

POST /api/files
Body: { name: string, type: 'grammar' | 'text', content?: string }
Response: { metadata: FileMetadata }

PUT /api/files/:id
Body: { content: string, createCheckpoint?: boolean, checkpointLabel?: string }
Response: { metadata: FileMetadata }

DELETE /api/files/:id
Response: { success: boolean }
```

### History Operations

```
GET /api/files/:id/history
Response: { history: VersionEntry[] }

POST /api/files/:id/history
Body: { label?: string }
Response: { version: VersionEntry }

POST /api/files/:id/history/:version/restore
Response: { metadata: FileMetadata, content: string, newVersion: VersionEntry }
```

### Workspace Operations

```
GET /api/workspace
Response: WorkspaceState

PUT /api/workspace
Body: Partial<WorkspaceState>
Response: WorkspaceState
```
