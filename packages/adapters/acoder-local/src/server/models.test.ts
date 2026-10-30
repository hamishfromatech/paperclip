import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ensureAcoderModelConfiguredAndAvailable,
  listAcoderModels,
  resetAcoderModelsCacheForTests,
} from "./models.js";

describe("acoder models", () => {
  afterEach(() => {
    delete process.env.PAPERCLIP_ACODER_COMMAND;
    resetAcoderModelsCacheForTests();
  });

  it("returns an empty list when discovery command is unavailable", async () => {
    process.env.PAPERCLIP_ACODER_COMMAND = "__paperclip_missing_pi_command__";
    await expect(listAcoderModels()).resolves.toEqual([]);
  });

  it("rejects when model is missing", async () => {
    await expect(
      ensureAcoderModelConfiguredAndAvailable({ model: "" }),
    ).rejects.toThrow("A-Coder requires `adapterConfig.model`");
  });

  it("rejects when discovery cannot run for configured model", async () => {
    process.env.PAPERCLIP_ACODER_COMMAND = "__paperclip_missing_pi_command__";
    await expect(
      ensureAcoderModelConfiguredAndAvailable({
        model: "xai/grok-4",
      }),
    ).rejects.toThrow();
  });

  it("does not embed the model catalogue when the configured model is unavailable", async () => {
    const directory = await mkdtemp(join(tmpdir(), "paperclip-acoder-models-"));
    const command = join(directory, "a-coder-cli");
    const modelIds = Array.from({ length: 13 }, (_, index) => `provider/model-${index}`);
    await writeFile(
      command,
      `#!/bin/sh\nprintf 'provider  model\\n';\n${modelIds
        .map((id) => {
          const [provider, model] = id.split("/");
          return `printf '${provider}  ${model}\\n'`;
        })
        .join(";\n")}\n`,
    );
    await chmod(command, 0o755);

    try {
      await expect(
        ensureAcoderModelConfiguredAndAvailable({
          command,
          model: "provider/missing",
        }),
      ).rejects.toMatchObject({
        message:
          "Configured A-Coder model is unavailable: provider/missing. 13 models are available; list them with `a-coder-cli --list-models`.",
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
