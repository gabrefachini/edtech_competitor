import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "date-fns";
import { loadConfig } from "./loadConfig";
import { runWeeklyCollection, writeCollectedState, readCollectedState } from "./collectionRunner";
import { generateEmailHtml, generateEmailMarkdown, writeExports } from "./generateEmail";
import type { EventItem } from "../lib/types";
import { resolveProjectPath } from "../lib/projectPaths";

const dataDir = resolveProjectPath("data");
const logsDir = path.join(dataDir, "logs");
const statePath = path.join(dataDir, "state.json");

function ensureDirs() {
  fs.mkdirSync(logsDir, { recursive: true });
}

function logLine(message: string) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  const logFile = path.join(logsDir, `${format(new Date(), "yyyy-MM-dd")}.log`);
  fs.appendFileSync(logFile, `${line}\n`);
}

function readHistoricalEvents(filePath: string) {
  if (!fs.existsSync(filePath)) return [] as EventItem[];
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as EventItem);
}

async function run() {
  await runWeeklyDigestJob();
}

export async function runWeeklyDigestJob(options: { skipCollection?: boolean } = {}) {
  ensureDirs();
  const runDate = new Date();
  const dateLabel = format(runDate, "yyyy-MM-dd");
  logLine("Starting weekly digest");

  const { competitors, products } = loadConfig();
  const state = readCollectedState(statePath);
  const history = readHistoricalEvents(path.join(dataDir, "events.jsonl"));
  const previousEvents = history.filter((event) => event.date < dateLabel);
  const currentEvents = history.filter((event) => event.date >= dateLabel);

  const result = options.skipCollection
    ? {
        events: currentEvents.length ? currentEvents : history,
        nextHashes: state.hashes
      }
    : await runWeeklyCollection(competitors as any, products, state.hashes);

  const markdown = generateEmailMarkdown(runDate, result.events, previousEvents, competitors as any);
  const html = generateEmailHtml(markdown);
  writeExports(dateLabel, markdown, html);

  if (!options.skipCollection) {
    writeCollectedState(statePath, result.nextHashes, runDate.toISOString());
  }
  logLine(`Completed with ${result.events.length} events`);
  return {
    date: dateLabel,
    events_count: result.events.length,
    markdown,
    html
  };
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedPath === currentFilePath) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
