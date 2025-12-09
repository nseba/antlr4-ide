# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ANTLR4 IDE is a web-based IDE for experimenting with ANTLR4 grammars. It allows users to write ANTLR4 grammar files, test them against input text, and visualize the resulting parse trees in real-time.

## Development Commands

### Setup
```bash
npm install
```
Install all dependencies.

### Run Development Server
```bash
npm run dev
```
Starts Vite dev server on port 3000 (configured in vite.config.ts). The server is configured to listen on `0.0.0.0` to allow network access.

### Type Checking
```bash
npm run type-check
```
Run TypeScript type checking without emitting files. Useful for catching type errors before building.

### Build for Production
```bash
npm run build
```
Runs TypeScript compiler followed by Vite build. Creates optimized production build in `dist/` folder.

### Preview Production Build
```bash
npm run preview
```
Serves the production build locally for testing.

### Linting
```bash
npm run lint
```
Run ESLint to check code quality and style issues.

## Environment Setup

Create a `.env.local` file to configure the AI assistant feature:
```bash
# AI Provider Configuration (all server-side)
AI_PROVIDER=anthropic                        # Provider: 'anthropic', 'openai', or 'gemini'
AI_MODEL=claude-sonnet-4-20250514           # Model ID (optional, has sensible defaults)
AI_MAX_TOKENS=2048                           # Max response tokens (optional)
AI_TEMPERATURE=0.7                           # Generation temperature (optional)

# API Key for the selected provider
ANTHROPIC_API_KEY=your_anthropic_key_here    # Required if AI_PROVIDER=anthropic
OPENAI_API_KEY=your_openai_key_here          # Required if AI_PROVIDER=openai
GEMINI_API_KEY=your_gemini_key_here          # Required if AI_PROVIDER=gemini
```

The AI assistant is fully configured server-side. The client only sends chat messages and grammar context - it has no knowledge of providers, models, or API keys.

## Project Structure

```
antlr4-ide/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── CodeEditor.tsx        # Monaco editor wrapper
│   │   ├── TreeVisualizer.tsx    # D3 parse tree visualization
│   │   ├── TabBar.tsx            # Multi-tab editor interface
│   │   ├── Tab.tsx               # Individual tab component
│   │   ├── HistoryPanel.tsx      # Version history panel
│   │   ├── DiffViewer.tsx        # Side-by-side diff view
│   │   ├── SaveStatus.tsx        # Auto-save status indicator
│   │   ├── Toast.tsx             # Toast notification component
│   │   └── ToastContainer.tsx    # Toast notification container
│   ├── services/                 # Frontend API clients
│   │   ├── fileService.ts        # File CRUD operations
│   │   ├── workspaceService.ts   # Workspace state management
│   │   └── historyService.ts     # Version history operations
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAutoSave.ts        # Auto-save with debouncing
│   │   └── useToast.ts           # Toast notification management
│   ├── types/                    # TypeScript type definitions
│   │   ├── index.ts              # Main application types
│   │   └── api.ts                # API request/response types
│   ├── utils/                    # Utility functions
│   │   ├── antlr/                # ANTLR4 runtime implementation
│   │   │   ├── index.ts          # Main parsing orchestration
│   │   │   ├── GrammarLoader.ts  # Grammar file parser
│   │   │   ├── Validation.ts     # Grammar validation
│   │   │   ├── LexerAdaptor.ts   # Runtime lexer
│   │   │   ├── ParserAdaptor.ts  # Runtime parser
│   │   │   └── types.ts          # ANTLR4-specific types
│   │   └── antlrInterpreter.ts   # Legacy interpreter (not used)
│   ├── App.tsx                   # Main application component
│   └── main.tsx                  # Application entry point
├── server/                       # Backend Node.js server
│   ├── index.ts                  # Express server entry point
│   ├── types.ts                  # Backend type definitions
│   ├── services/                 # Backend services
│   │   ├── fileStorage.ts        # File system operations
│   │   ├── historyService.ts     # Version history management
│   │   └── workspaceService.ts   # Workspace state service
│   └── routes/                   # Express API routes
│       ├── files.ts              # File CRUD endpoints
│       ├── history.ts            # Version history endpoints
│       └── workspace.ts          # Workspace state endpoints
├── data/                         # Persistent storage (local dev)
│   └── projects/                 # User files, metadata, history
├── Dockerfile                    # Docker image configuration
├── docker-compose.yml            # Docker Compose configuration
├── index.html                    # HTML template
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build configuration
└── CLAUDE.md                     # This file
```

## Architecture Overview

### Core ANTLR4 Interpretation System

The application uses a modular ANTLR4 runtime implementation located in `src/utils/antlr/`:

- **`index.ts`** - Main entry point (`parseGeneric` function) that orchestrates the parsing pipeline
- **`GrammarLoader.ts`** - Parses grammar files and builds grammar definitions
- **`Validation.ts`** - Validates grammar for errors (undefined rules, left-recursion, etc.)
- **`LexerAdaptor.ts`** - Runtime lexer implementation extending ANTLR4's Lexer class (v4.13.2)
- **`ParserAdaptor.ts`** - Runtime parser implementation extending ANTLR4's Parser class
- **`types.ts`** - TypeScript type definitions for the ANTLR4 system

**Note:** There's also a legacy `antlrInterpreter.ts` file that is no longer used but kept for reference.

### State Management

The app uses a hybrid state management approach:

**Backend Persistence (Primary)**:
- **Files**: Grammar files (.g4) and input text files stored via REST API in `./data/projects/`
- **Workspace**: Open tabs, active tab, settings stored in `workspace.json`
- **Version History**: Per-file history stored in `{fileId}.history.json`

**Frontend State**:
- React state for runtime UI state (active tab, parse results, etc.)
- Auto-save with 2-second debounce via `useAutoSave` hook
- Toast notifications via `useToast` hook

**LocalStorage (Legacy)**:
- Layout preferences (console height) in `STORAGE_KEYS.LAYOUT`
- Legacy file storage keys remain for backward compatibility migration

### Component Structure

- **`App.tsx`** - Main application container with:
  - File explorer sidebar (grammars and input files)
  - TabBar for multi-file editing
  - Monaco editor for editing files
  - Resizable bottom panel (Console, Tokens, Analysis, History tabs)
  - Parse tree visualization panel
  - Header with controls (Run, Save, Open, Start Rule input)

- **`TabBar.tsx` / `Tab.tsx`** - Multi-tab editor interface:
  - Drag-and-drop tab reordering
  - Context menu (Close, Close Others, Close All)
  - Unsaved changes indicator (orange dot)
  - Keyboard shortcuts (Ctrl+Tab, Ctrl+W, Ctrl+S)

- **`HistoryPanel.tsx` / `DiffViewer.tsx`** - Version history system:
  - View file version history
  - Create manual checkpoints
  - Restore to previous versions
  - View diffs between versions

- **`components/CodeEditor.tsx`** - Monaco editor wrapper with custom ANTLR4 syntax highlighting
  - Registers custom ANTLR4 language mode with Monarch tokenizer
  - Configures editor theme and options

- **`components/TreeVisualizer.tsx`** - D3-based parse tree visualization
  - Uses D3 hierarchy and tree layout algorithms
  - Implements zoom/pan controls
  - Highlights selected tokens in the tree
  - Node colors: green (parser rules), blue (tokens), red (errors)

### Data Flow

1. User edits grammar or input file → Updates `files` state → Persisted to localStorage
2. User clicks "Run" → `runParser()` in App.tsx:228
3. Parser collects all grammar files → Calls `parseGeneric()` from `utils/antlr/index.ts`
4. `parseGeneric()` pipeline:
   - Loads and validates grammar files
   - Creates runtime lexer and tokenizes input
   - Creates runtime parser and builds parse tree
   - Converts ANTLR4 native tree to `ParseNode` format for visualization
5. Result stored in `parseResult` state → Updates console and tree visualizer

### Type System

Main types defined in `types.ts`:
- `ProjectFile` - Represents a grammar or input text file
- `ParseResult` - Contains tree, tokens, errors, and duration
- `ParseNode` - Tree structure for visualization
- `Token` - Lexer token with position information
- `ParseError` - Error/warning/info messages with severity

### Monaco Editor Integration

The CodeEditor component (CodeEditor.tsx:14-33) registers a custom ANTLR4 language definition with Monaco's Monarch tokenizer system. This provides basic syntax highlighting for:
- Lexer rules (uppercase identifiers)
- Parser rules (lowercase identifiers)
- String literals
- Comments (line and block)
- Delimiters

### D3 Tree Visualization

TreeVisualizer uses D3's hierarchy and tree layout:
- Horizontal layout (left-to-right)
- Fixed node size of [40, 120] to prevent overlap
- Zoom behavior with scale extent [0.1, 4]
- Initial zoom: 0.8 scale, centered vertically
- Click nodes to select tokens (highlights in console)

### File Management

Users can:
- Create new grammar (.g4) or input (.txt) files via sidebar buttons
- Rename files by double-clicking or clicking edit icon
- Delete files (requires at least 1 file to remain)
- Save entire project as JSON file
- Load project from JSON file

File naming: Auto-increments names (NewGrammar1.g4, NewGrammar2.g4) to avoid conflicts.

### Console Panel

Two tabs:
1. **Console** - Shows parse errors, warnings, and info messages with severity indicators
2. **Tokens** - Table of all lexed tokens with type, text, and position

The console is resizable via draggable handle (App.tsx:298-330 implements resize logic).

### Styling

Uses Tailwind CSS with custom IDE-themed color variables:
- `bg-ide-bg`, `bg-ide-sidebar`, `bg-ide-panel`, `bg-ide-activity`
- `text-ide-text`, `text-ide-textActive`
- `border-ide-border`, `border-ide-accent`

These classes are referenced throughout but actual color values are defined in global CSS (not included in analyzed files).

## Important Implementation Details

### ANTLR4 Runtime Adapters

The LexerAdaptor and ParserAdaptor classes extend ANTLR4's base Lexer and Parser classes to create a runtime interpreter. They use:
- `CommonToken` for tokens
- `ParserRuleContext` for parse tree nodes
- `TerminalNode` for leaf tokens
- `ErrorListener` for error collection

### Grammar Validation

The validation system (Validation.ts) checks for:
- Undefined rule references in parser rules
- Undefined token references
- Direct left-recursion (warns but doesn't block in all cases)

### Fragment Expansion

Lexer fragments are expanded recursively during grammar loading (GrammarLoader.ts:252-268). The system supports up to 10 levels of fragment nesting.

### Token Skip Rules

Tokens with `-> skip` or `-> channel(HIDDEN)` are automatically filtered during lexing. Common patterns: WS, SKIP, HIDDEN rule names.

## Backend API

The backend server (`server/index.ts`) provides REST API endpoints for file persistence and parsing.

### Starting the Backend

```bash
# Development (with auto-reload)
npx tsx server/index.ts

# Backend runs on port 3001 by default
```

### API Endpoints

**File Operations** (`/api/files`):
- `GET /api/files` - List all files
- `GET /api/files/:id` - Get file content and metadata
- `POST /api/files` - Create new file
- `PUT /api/files/:id` - Update file content (with optional checkpoint)
- `DELETE /api/files/:id` - Delete file

**Version History** (`/api/files/:id/history`):
- `GET /api/files/:id/history` - Get file's version history
- `POST /api/files/:id/history` - Create manual checkpoint
- `GET /api/files/:id/history/:version` - Get specific version
- `POST /api/files/:id/history/:version/restore` - Restore to version

**Workspace** (`/api/workspace`):
- `GET /api/workspace` - Get workspace state (open tabs, settings)
- `PUT /api/workspace` - Update workspace state (partial updates)

**Parse** (`/api/parse`):
- `POST /api/parse` - Parse input with grammar files

### Data Storage

Files are stored in `./data/projects/` (configurable via `DATA_DIR` env var):
- `{fileId}.g4` or `{fileId}.txt` - File content
- `{fileId}.meta.json` - File metadata (name, type, timestamps)
- `{fileId}.history.json` - Version history entries
- `workspace.json` - Workspace state

## Docker Deployment

### Quick Start

```bash
# Build and run
docker-compose up --build

# Access the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
```

### Volume Persistence

User data is stored in a Docker volume for persistence:

```yaml
volumes:
  - antlr4ide_data:/app/data  # User files, history, workspace
  - antlr-tmp:/app/.antlr-tmp # ANTLR temp files
```

**Volume Management**:
- **Backup**: `docker cp antlr4-ide:/app/data ./backup`
- **Restore**: `docker cp ./backup/. antlr4-ide:/app/data`
- **Reset**: `docker-compose down -v && docker-compose up`

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `3001` | Backend API port |
| `DATA_DIR` | `/app/data` | Data storage directory |

### First-Time Startup

On first run with an empty data directory, the server automatically creates:
- Sample grammar file (`Expr.g4`)
- Sample input file (`input.txt`)
- Initial workspace state with both files open
