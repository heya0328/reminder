import fs from "node:fs";
import path from "node:path";

export function loadEnvFiles() {
  for (const filePath of [path.resolve(process.cwd(), "../.env"), path.resolve(process.cwd(), ".env")]) {
    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      process.env[key] ??= value;
    }
  }
}
