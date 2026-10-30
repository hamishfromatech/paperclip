import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAcoderJsonl } from "./parse.js";
import { parseAcoderStdoutLine } from "../ui/parse-stdout.js";

const SMOKE_FILE = process.env.ACODER_SMOKE_JSONL ?? "";
const SMOKE_EXPECT = (process.env.ACODER_SMOKE_EXPECT ?? "hello").toLowerCase();

describe.skipIf(!SMOKE_FILE)("live a-coder-cli --mode json smoke capture", () => {
  const readRaw = () => fs.readFileSync(SMOKE_FILE, "utf8");

  it("parses a real run end-to-end", () => {
    const raw = readRaw();
    const parsed = parseAcoderJsonl(raw);
    expect(parsed.sawAgentEnd).toBe(true);
    expect(parsed.errors).toEqual([]);
    expect((parsed.finalMessage ?? "").toLowerCase()).toContain(SMOKE_EXPECT);
    expect(parsed.usage.inputTokens).toBeGreaterThan(0);
    expect(parsed.usage.outputTokens).toBeGreaterThan(0);
  });

  it("renders transcript entries from a real run", () => {
    const raw = readRaw();
    const entries = raw
      .split("\n")
      .filter(Boolean)
      .flatMap((line) => parseAcoderStdoutLine(line, new Date().toISOString()));
    expect(entries.some((entry) => entry.kind === "assistant")).toBe(true);
    expect(entries.some((entry) => entry.kind === "result")).toBe(true);
  });
});