import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { execute } from "./execute.js";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";

// Live end-to-end proof: runs the REAL a-coder-cli through the adapter's
// execute() with a real model, then resumes the same session on a second
// wake. Opt-in only — skipped unless ACODER_LIVE_E2E=1.
const LIVE = process.env.ACODER_LIVE_E2E === "1";
const MODEL = process.env.ACODER_LIVE_MODEL ?? "ollama-cloud/glm-5.3-flash";

async function runOnce(
  promptTemplate: string,
  runtime: AdapterExecutionContext["runtime"],
  cwd: string,
): Promise<AdapterExecutionResult> {
  const ctx: AdapterExecutionContext = {
    runId: `live-acoder-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    agent: {
      id: "live-smoke-agent",
      companyId: "live-smoke-company",
      name: "A-Coder Live Smoke",
      adapterType: "acoder_local",
      adapterConfig: {},
    },
    runtime,
    config: {
      command: "a-coder-cli",
      cwd,
      model: MODEL,
      promptTemplate,
      timeoutSec: 180,
      graceSec: 10,
    },
    context: {},
    onLog: async () => {},
  };
  return await execute(ctx);
}

describe.skipIf(!LIVE)("live acoder_local execute() with a real model", () => {
  it("runs a real task, captures usage, and resumes the session on the next wake", async () => {
    // Use the realpath'd temp dir: a-coder stores its own realpath'd cwd in the
    // session header, and resume compares cwd paths textually (same as pi_local).
    const cwd = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-acoder-live-")));
    try {
      const first = await runOnce(
        "This is a Paperclip smoke run. Reply with exactly the word: ready",
        { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
        cwd,
      );
    expect(first.exitCode).toBe(0);
    expect(first.errorMessage).toBeNull();
    expect((first.summary ?? "").toLowerCase()).toContain("ready");
    expect(first.usage?.outputTokens ?? 0).toBeGreaterThan(0);
    expect(first.sessionParams?.sessionId).toBeTruthy();
    expect(String(first.sessionParams?.sessionId)).toContain(path.join(".a-coder", "paperclips"));

    // Second wake: resume the stored session; same cwd comes from sessionParams.
      const resumed = await runOnce(
        "Continue this Paperclip smoke run. Reply with exactly the word: again",
        {
          sessionId: null,
          sessionParams: first.sessionParams as Record<string, unknown>,
          sessionDisplayId: null,
          taskKey: null,
        },
        cwd,
      );
      expect(resumed.exitCode).toBe(0);
      expect((resumed.summary ?? "").toLowerCase()).toContain("again");
      // The conversation continues in the same A-Coder session file.
      expect(resumed.sessionParams?.sessionId).toBe(first.sessionParams?.sessionId);
    } finally {
      await fs.rm(cwd, { recursive: true, force: true });
    }
  }, 300_000);
});