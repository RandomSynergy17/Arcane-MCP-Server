#!/usr/bin/env tsx
/**
 * Generates TypeScript types from the Arcane OpenAPI specification
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPENAPI_PATH = join(__dirname, "../_docs/arcane_api_docs.yaml");
const OUTPUT_DIR = join(__dirname, "../src/types/generated");
const OUTPUT_PATH = join(OUTPUT_DIR, "arcane-api.ts");

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.error(`Created directory: ${OUTPUT_DIR}`);
}

// Check if OpenAPI spec exists
if (!existsSync(OPENAPI_PATH)) {
  console.error(`Error: OpenAPI spec not found at ${OPENAPI_PATH}`);
  process.exit(1);
}

console.error(`Generating types from: ${OPENAPI_PATH}`);
console.error(`Output: ${OUTPUT_PATH}`);

try {
  execSync(`npx openapi-typescript "${OPENAPI_PATH}" -o "${OUTPUT_PATH}"`, {
    stdio: "inherit",
  });
  console.error("Types generated successfully!");
} catch (error) {
  console.error("Failed to generate types:", error);
  process.exit(1);
}
