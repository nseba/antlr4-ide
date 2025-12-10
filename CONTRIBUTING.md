# Contributing to ANTLR4 IDE

Thank you for your interest in contributing to ANTLR4 IDE! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate in all interactions. We welcome contributors of all backgrounds and experience levels.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/nseba/antlr4-ide/issues)
2. If not, create a new issue with:
   - A clear, descriptive title
   - Steps to reproduce the bug
   - Expected vs actual behavior
   - Browser and OS information
   - Screenshots if applicable

### Suggesting Features

1. Check existing issues for similar suggestions
2. Create a new issue with the "enhancement" label
3. Describe the feature and its use case
4. Explain why it would be valuable

### Pull Requests

1. Fork the repository
2. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes
4. Run checks before committing:
   ```bash
   npm run type-check
   npm run lint
   npm run build
   ```
5. Commit with clear, descriptive messages
6. Push to your fork and create a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+
- npm

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/antlr4-ide.git
cd antlr4-ide

# Install dependencies
npm install

# Start development servers
npm run dev:all
```

### Project Structure

- `src/` - Frontend React application
- `server/` - Backend Express server
- `src/utils/antlr/` - ANTLR4 runtime implementation

### Running Tests

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build
```

## Coding Standards

### TypeScript

- Use strict TypeScript with proper type annotations
- Avoid `any` types when possible
- Use interfaces for object shapes

### React

- Use functional components with hooks
- Keep components focused and single-purpose
- Use meaningful component and prop names

### Code Style

- Use consistent indentation (2 spaces)
- Follow ESLint rules configured in the project
- Write clear comments for complex logic

## Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system or dependency changes
- `ci`: CI/CD configuration changes
- `chore`: Other changes that don't modify src or test files

### Examples

```bash
feat(editor): add syntax highlighting for lexer rules
fix(parser): handle empty input gracefully
docs(readme): update development setup instructions
refactor(tree): simplify node rendering logic
```

### Guidelines

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Keep the first line under 72 characters
- Reference issues in the footer: `Fixes #123` or `Closes #456`

## Questions?

Feel free to open an issue for any questions about contributing.

Thank you for helping improve ANTLR4 IDE!
