# Contributing to Arcane MCP Server

Thank you for your interest in contributing to Arcane MCP Server! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/RandomSynergy17/Arcane-MCP-Server.git
   cd Arcane-MCP-Server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Generate types from OpenAPI spec**
   ```bash
   npm run build:types
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Run in development mode**
   ```bash
   # stdio mode (for Claude Code/Desktop)
   npm run dev

   # HTTP mode (for network clients)
   npm run dev:tcp
   ```

## Code Structure

```
src/
├── index.ts              # stdio entry point
├── tcp-server.ts         # HTTP server entry point
├── server.ts             # MCP server factory
├── config.ts             # Configuration management
├── constants.ts          # Shared constants
├── client/
│   └── arcane-client.ts  # HTTP client for Arcane API
├── auth/
│   └── auth-manager.ts   # Authentication handling
├── tools/                # MCP tool implementations
│   ├── index.ts          # Tool registry
│   ├── container-tools.ts
│   ├── image-tools.ts
│   └── ...
├── types/
│   └── generated/        # Auto-generated types from OpenAPI
└── utils/
    ├── logger.ts         # stderr logging utility
    └── error-handler.ts  # Error formatting
```

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Use meaningful variable/function names
- Add JSDoc comments for exported functions
- Keep functions focused and small

### Tool Implementation Pattern

When adding new tools, follow this pattern:

```typescript
server.tool(
  "arcane_resource_action",
  "Clear description of what this tool does",
  {
    // Zod schema for parameters
    param1: z.string().describe("Parameter description"),
  },
  async ({ param1 }) => {
    try {
      const client = getArcaneClient();
      const response = await client.get<ResponseType>(`/endpoint/${param1}`);

      // Format response as text
      return { content: [{ type: "text", text: "Formatted result" }] };
    } catch (error) {
      return { content: [{ type: "text", text: formatError(error) }] };
    }
  }
);
```

### Logging

**CRITICAL**: All logging MUST go to stderr to avoid corrupting JSON-RPC protocol on stdout.

```typescript
import { logger } from "./utils/logger.js";

logger.debug("Debug message");
logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message");
```

### Error Handling

- Use custom error classes from `error-handler.ts`
- Always format errors for user display
- Preserve error cause chain (ES2022)
- Don't expose sensitive information in errors

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm test -- --watch
```

### Writing Tests

- Place tests in `src/*.test.ts` or `tests/`
- Use descriptive test names
- Test both success and error paths
- Mock external dependencies

Example test:

```typescript
import { describe, it, expect, vi } from "vitest";
import { formatError, ArcaneApiError } from "./error-handler";

describe("formatError", () => {
  it("should format API errors with status codes", () => {
    const error = new ArcaneApiError("Not found", 404);
    const formatted = formatError(error);
    expect(formatted).toContain("Not found");
    expect(formatted).toContain("resource was not found");
  });
});
```

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
   - Follow code style guidelines
   - Add tests for new functionality
   - Update documentation if needed

3. **Run checks locally**
   ```bash
   npm run lint
   npm run build
   npm test
   ```

4. **Commit your changes**
   - Use clear, descriptive commit messages
   - Reference issues if applicable

5. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   ```

6. **PR Requirements**
   - All CI checks must pass
   - Code review approval required
   - No merge conflicts

## Security

### Reporting Vulnerabilities

Please report security vulnerabilities privately by emailing the maintainers. Do not create public issues for security problems.

### Security Guidelines

- Never log sensitive data (passwords, tokens, API keys)
- Validate all user input
- Use path validation to prevent traversal attacks
- Keep dependencies updated
- Follow principle of least privilege

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions, please:
1. Check existing issues and discussions
2. Review the documentation
3. Create a new issue with the question label
