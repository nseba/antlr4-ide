# ANTLR4 IDE

[![CI](https://github.com/nseba/antlr4-ide/actions/workflows/ci.yml/badge.svg)](https://github.com/nseba/antlr4-ide/actions/workflows/ci.yml)
[![Release](https://github.com/nseba/antlr4-ide/actions/workflows/release.yml/badge.svg)](https://github.com/nseba/antlr4-ide/actions/workflows/release.yml)
[![GitHub release](https://img.shields.io/github/v/release/nseba/antlr4-ide)](https://github.com/nseba/antlr4-ide/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, web-based IDE for experimenting with ANTLR4 grammars. Write grammar files, test them against input text, and visualize parse trees in real-time.

![ANTLR4 IDE](./docs/screenshot.png)

## Features

- 📝 **Monaco Editor** - Full-featured code editor with ANTLR4 syntax highlighting
- 🌳 **Interactive Parse Tree Visualization** - D3-based tree rendering with zoom/pan controls
- 🔍 **Real-time Error Detection** - Grammar validation and parsing errors displayed instantly
- 💾 **Project Management** - Save and load entire projects as JSON files
- 📦 **Multiple Files** - Support for multiple grammar files and input files
- 🎨 **VS Code-inspired UI** - Familiar IDE interface with resizable panels
- 🚀 **No Build Required** - Works entirely in the browser using ANTLR4 JavaScript runtime

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd antlr4-ide

# Install dependencies
npm install
```

### Development Setup

The application requires **two servers** running simultaneously:

1. **Backend Server** (port 3001) - Handles file persistence, parsing, and AI features
2. **Frontend Server** (port 3000) - Vite dev server for the React application

**Option 1: Start both servers with a single command (recommended):**

```bash
npm run dev:all
```

**Option 2: Start servers in separate terminals:**

```bash
# Terminal 1: Start the backend server
npm run server
# or: npx tsx server/index.ts

# Terminal 2: Start the frontend dev server
npm run dev
```

The application will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The production build will be created in the `dist/` directory.

---

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

The application will be available at:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001`

### Using Docker Directly

```bash
# Build the Docker image
docker build -t antlr4-ide .

# Run the container
docker run -d \
  --name antlr4-ide \
  -p 3000:3000 \
  -p 3001:3001 \
  -v antlr4ide_data:/app/data \
  -e NODE_ENV=production \
  -e PORT=3001 \
  antlr4-ide
```

### Data Persistence

User data is stored in a Docker volume:

```bash
# Backup data
docker cp antlr4-ide:/app/data ./backup

# Restore data
docker cp ./backup/. antlr4-ide:/app/data

# Reset to clean state (removes all user data)
docker-compose down -v && docker-compose up -d
```

---

## Environment Variables

### Core Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Node environment (`development` or `production`) |
| `PORT` | `3001` | Backend API port |
| `DATA_DIR` | `./data` | Data storage directory for files and workspace |

### AI Assistant Configuration

The AI assistant feature requires an API key from one of the supported providers:

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PROVIDER` | `anthropic` | AI provider: `anthropic`, `openai`, or `gemini` |
| `AI_MODEL` | (per provider) | Model ID (optional, uses sensible defaults) |
| `AI_MAX_TOKENS` | `2048` | Maximum response tokens |
| `AI_TEMPERATURE` | `0.7` | Generation temperature |
| `ANTHROPIC_API_KEY` | - | API key for Anthropic (required if `AI_PROVIDER=anthropic`) |
| `OPENAI_API_KEY` | - | API key for OpenAI (required if `AI_PROVIDER=openai`) |
| `GEMINI_API_KEY` | - | API key for Google Gemini (required if `AI_PROVIDER=gemini`) |

**Default models per provider:**
- Anthropic: `claude-sonnet-4-20250514`
- OpenAI: `gpt-4o`
- Gemini: `gemini-1.5-pro`

### Local Development Setup

Create a `.env.local` file in the project root:

```bash
# AI Provider Configuration
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-20250514

# API Key (set only the one for your provider)
ANTHROPIC_API_KEY=your_key_here
# OPENAI_API_KEY=your_key_here
# GEMINI_API_KEY=your_key_here
```

### Docker Compose Setup

For Docker, you can either:

1. **Use environment variables** (recommended for CI/CD):
   ```bash
   ANTHROPIC_API_KEY=your_key docker-compose up -d
   ```

2. **Create a `.env` file** in the project root:
   ```bash
   ANTHROPIC_API_KEY=your_key_here
   ```

3. **Edit `docker-compose.yml`** directly (not recommended for secrets)

## Usage

### Creating a Grammar

1. Click the **Grammar** icon (⚙️) in the sidebar to create a new grammar file
2. Write your ANTLR4 grammar using standard syntax:

```antlr
grammar Expr;

expr:   term (('+'|'-') term)* ;
term:   factor (('*'|'/') factor)* ;
factor: NUMBER | '(' expr ')' ;

NUMBER: [0-9]+ ;
WS:     [ \t\r\n]+ -> skip ;
```

### Adding Input Text

1. Click the **Text** icon (📄) in the sidebar to create a new input file
2. Enter text to parse:

```
(10 + 20) * 3
```

### Running the Parser

1. Set the **Start Rule** in the header (e.g., `expr`)
2. Click the **Run** button
3. View the results:
   - **Console tab**: Errors and warnings
   - **Tokens tab**: Lexer token stream
   - **Parse Tree panel**: Visual representation of the parse tree

### Managing Files

- **Rename**: Double-click a file or click the edit icon
- **Delete**: Click the trash icon (requires at least 1 file to remain)
- **Save Project**: Click the **Save** button to download as JSON
- **Load Project**: Click the **Open** button to load a saved project

## Project Structure

```
src/
├── components/          # React components
│   ├── CodeEditor.tsx   # Monaco editor wrapper
│   └── TreeVisualizer.tsx  # D3 parse tree visualization
├── types/               # TypeScript type definitions
├── utils/
│   └── antlr/           # ANTLR4 runtime implementation
│       ├── index.ts     # Main parsing orchestration
│       ├── GrammarLoader.ts  # Grammar file parser
│       ├── Validation.ts     # Grammar validation
│       ├── LexerAdaptor.ts   # Runtime lexer
│       ├── ParserAdaptor.ts  # Runtime parser
│       └── types.ts          # ANTLR4-specific types
├── App.tsx              # Main application component
└── main.tsx             # Application entry point
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript 5.8** - Type safety
- **Vite 6** - Build tool and dev server
- **Monaco Editor** - Code editor (same as VS Code)
- **D3.js 7** - Parse tree visualization
- **ANTLR4 4.13.2** - Parser runtime
- **Lucide React** - Icon library
- **Tailwind CSS** - Styling

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint

### Type Checking

The project uses strict TypeScript configuration. Run type checking with:

```bash
npm run type-check
```

### Code Style

ESLint is configured for code quality. Run linting with:

```bash
npm run lint
```

## Configuration

### Vite Configuration

The Vite configuration (`vite.config.ts`) includes:
- React plugin for JSX support
- Path alias `@/` pointing to `src/`
- Development server on port 3000 (configurable)

### TypeScript Configuration

The TypeScript configuration (`tsconfig.json`) uses:
- Strict type checking enabled
- Path mapping for `@/*` imports
- ES2022 target with DOM libraries

## Grammar Validation

The application validates ANTLR4 grammars for:
- **Undefined rule references** - Parser rules referencing non-existent rules
- **Undefined token references** - References to tokens not defined in lexer
- **Direct left-recursion** - Simple cases of left-recursive rules

## Parse Tree Visualization

The parse tree visualizer features:
- **Horizontal layout** - Left-to-right tree structure
- **Color coding**:
  - 🟢 Green nodes: Parser rules
  - 🔵 Blue nodes: Tokens
  - 🔴 Red nodes: Errors
- **Interactive controls**:
  - Click nodes to select tokens
  - Zoom in/out with + and - buttons
  - Reset view with refresh button
  - Pan by dragging the canvas

## Known Limitations

- Complex left-recursion detection is basic
- Fragment expansion limited to 10 levels
- Large grammars may impact performance
- Browser-based only (no command-line usage)

## Troubleshooting

### Build Errors

If you encounter build errors:
1. Clear node_modules: `rm -rf node_modules package-lock.json`
2. Reinstall: `npm install`
3. Rebuild: `npm run build`

### Type Errors

If TypeScript errors persist:
1. Run type check: `npm run type-check`
2. Check import paths use `@/` alias
3. Verify all files are in `src/` directory

### Runtime Errors

If the parser fails:
1. Check grammar syntax in the console
2. Verify start rule name is correct
3. Ensure at least one grammar and input file exist

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with [ANTLR4](https://www.antlr.org/) by Terence Parr
- Editor powered by [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- Visualization using [D3.js](https://d3js.org/)
- UI inspired by VS Code

## Support

For issues and questions:
- Create an issue on GitHub
- Check the [ANTLR4 documentation](https://github.com/antlr/antlr4/tree/master/doc)
- Review [example grammars](https://github.com/antlr/grammars-v4)
