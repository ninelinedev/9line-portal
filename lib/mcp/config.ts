import { config } from "dotenv";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { z } from "zod";

/**
 * Load environment configuration for 9line-portal MCP integration
 * Tries to load .env from current working directory first, then from project root
 */
export function loadConfig(): void {
  let dir = process.cwd();
  let envLoaded = false;

  while (true) {
    const envPath = join(dir, '.env.local');
    if (existsSync(envPath)) {
      config({ path: envPath });
      envLoaded = true;
      break;
    }

    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }

    dir = parent;
  }

  if (!envLoaded) {
    config();
  }
}

/**
 * Load and validate environment configuration with Zod schema
 * @param schema - Zod schema to validate environment variables
 * @returns Parsed and validated environment configuration
 */
export function loadAndValidateConfig<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): z.infer<z.ZodObject<T>> | null {
  // Load .env file first
  loadConfig();
  
  try {
    // Parse and validate environment variables
    return schema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn("⚠️ MCP configuration not found - MCP features will be disabled");
      console.warn("Add these variables to .env.local to enable MCP:");
      error.issues.forEach((err: z.ZodIssue) => {
        console.warn(`  - ${err.path.join('.')}`);
      });
    } else {
      console.error("❌ Unexpected error during environment validation:", error);
    }
    return null; // Return null instead of throwing
  }
}