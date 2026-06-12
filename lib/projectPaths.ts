import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function hasProjectMarkers(directory: string) {
  return (
    fs.existsSync(path.join(directory, "package.json")) &&
    (
      fs.existsSync(path.join(directory, "config")) ||
      fs.existsSync(path.join(directory, "app"))
    )
  );
}

function walkUp(start: string) {
  let current = path.resolve(start);
  while (true) {
    if (hasProjectMarkers(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function inferProjectRoot() {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return walkUp(process.cwd()) ?? walkUp(moduleDir) ?? process.cwd();
}

export const PROJECT_ROOT = inferProjectRoot();

export function resolveProjectPath(...segments: string[]) {
  return path.join(PROJECT_ROOT, ...segments);
}
