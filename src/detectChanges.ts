import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type UrlHashState = Record<string, string>;

export function hashContent(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function readState(statePath: string): { last_run?: string; hashes: UrlHashState } {
  if (!fs.existsSync(statePath)) return { hashes: {} };
  const raw = fs.readFileSync(statePath, "utf8");
  const parsed = JSON.parse(raw) as { last_run?: string; hashes?: UrlHashState };
  return { last_run: parsed.last_run, hashes: parsed.hashes ?? {} };
}

export function writeState(statePath: string, state: { last_run: string; hashes: UrlHashState }) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

export function hasChanged(url: string, contentHash: string, hashes: UrlHashState) {
  return hashes[url] !== contentHash;
}
