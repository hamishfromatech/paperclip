---
title: A-Coder CLI
summary: A-Coder CLI local adapter setup and configuration
---

The `acoder_local` adapter runs the A-Coder CLI (`a-coder-cli`, the self-extensible terminal coding harness from [hamishfromatech/a-coder-cli](https://github.com/hamishfromatech/a-coder-cli)) locally as a Paperclip agent. It supports session resume across heartbeats, Paperclip skill delivery into the A-Coder skills home, thinking-level control, managed custom providers, and structured `--mode json` output parsing. It is the recommended adapter for teams standardizing on A-Coder CLI and the A-Coder Desktop app.

## Prerequisites

- A-Coder CLI installed (the `a-coder-cli` command available; install with the [installer script](https://github.com/hamishfromatech/a-coder-cli), e.g. `curl -sSf https://raw.githubusercontent.com/hamishfromatech/a-coder-cli/feat/desktop-unified-release/install-a-coder.sh | bash`)
- Authentication configured via one of:
  - A provider API key in the adapter env (for example `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, or `OPENROUTER_API_KEY`)
  - An existing A-Coder subscription login (`/login` inside the CLI, or an AI connection in Paperclip)
  - Custom providers supplied through `PAPERCLIP_ACODER_PROVIDERS` (see below)

## Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cwd` | string | No | Working directory for the agent process (absolute path; created automatically if missing when permissions allow). Falls back to the resolved execution workspace. |
| `model` | string | Yes | A-Coder model id in `provider/model` format (for example `anthropic/claude-sonnet-4-5`). List available models with `a-coder-cli --list-models`. |
| `promptTemplate` | string | No | Prompt used for runs. Defaults to the shared Paperclip agent execution contract. |
| `instructionsFilePath` | string | No | Markdown instructions file appended to the system prompt via `--append-system-prompt`. |
| `thinking` | string | No | Thinking level: `off`, `minimal`, `low`, `medium`, `high`, `xhigh`. |
| `command` | string | No | CLI command override. Defaults to `a-coder-cli`. |
| `extraArgs` | string[] | No | Additional CLI arguments appended to every run. |
| `env` | object | No | Environment variables (supports secret refs), for example `ANTHROPIC_API_KEY`. |
| `stdoutLogMode` | string | No | Run-log compaction mode: `compact` (default) or `raw`. |
| `timeoutSec` | number | No | Process timeout (0 = no timeout, the default). |
| `graceSec` | number | No | Grace period before force-kill (default 20). |

## Execution

Runs execute as:

```
a-coder-cli --mode json -p --append-system-prompt <paperclip system prompt extension> \
  [--provider <provider>] [--model <model>] [--thinking <level>] \
  --exclude-tools ask_user_question,memory,plan_mode,schedule_task,send_message,... \
  --session <session file> --skill <skills home> <prompt>
```

Paperclip never passes a `--tools` allowlist: that would filter out discovered MCP
tools (`mcp__<server>__<tool>`), which the production runbook needs (chrome-devtools,
comfy, context7, hf-mcp, …). `--exclude-tools` removes interactive-only built-ins
(`ask_user_question`, the task graph, agent teams, plan mode, memory, `schedule_task`,
`send_message`, subagents, `todo`, `decide`, `computer`) so unattended heartbeats stay
deterministic. MCP and extension tools auto-enable on discovery, exactly as in an
interactive A-Coder session. Base tools are `read`, `bash`, `edit`, `write`;
`grep`/`find`/`ls` and skills remain reachable through `bash` and `read` (skills are
listed in the system prompt with their `SKILL.md` paths).

When `PAPERCLIP_ACODER_PROVIDERS` is set, the managed config dir symlinks the
operator's real `auth.json`, `settings.json`, `bin`, `logs`, and skills home, then
overlays `models.json` with the real providers plus the injected ones, so credentials,
permission mode, MCP definitions, and installed extensions keep working without being
copied. Without custom providers the run uses the real agent dir untouched.

Output is parsed from the `--mode json` JSONL event stream (agent/turn/message lifecycle, tool executions, usage and cost accounting), which drives the run transcript, usage records, and the `paperclipai run --watch` CLI formatter.

## Session Persistence

Sessions are stored as A-Coder JSONL files under `~/.a-coder/paperclips/` and resumed with `--session` across heartbeats, so the agent keeps its conversation context between wakes. Resume is cwd-aware and execution-target-aware: if the working directory or target changed, a fresh session starts instead. If resume fails with an unknown-session error, the adapter automatically retries with a fresh session and clears the stale stored session.

## Skills

Paperclip symlinks the desired Paperclip skills into the A-Coder skills home (`~/.a-coder/cli/agent/skills`, honoring `A_CODER_CLI_CODING_AGENT_DIR`), the same persistent-skill pattern used by `pi_local`. Skills stay linked across runs; the agent's own skills are never overwritten.

### Control-plane skill

`paperclipai agent local-cli <agentRef> -C <companyId>` installs the Paperclip control-plane skills into `~/.a-coder/cli/agent/skills` (alongside `~/.codex/skills`, `~/.claude/skills`, and `~/.kimi-code/skills`), so the agent has the control-plane API reference from turn one. Pass `--no-install-skills` to skip.

## Managed custom providers

`PAPERCLIP_ACODER_PROVIDERS` (a JSON object in A-Coder's `models.json` `"providers"` shape) materializes custom or gateway providers into a managed agent-config directory and points `A_CODER_CLI_CODING_AGENT_DIR` at it. `{env:VAR}` placeholders are expanded server-side so gateway credentials travel reliably. This mirrors the `pi_local` `PAPERCLIP_PI_PROVIDERS` mechanism.

## AI connections

Managed AI connections work for the providers A-Coder supports natively: Anthropic, OpenAI, Google, and OpenRouter (API-key method). For OpenRouter connections the model id is routed in `openrouter/<model>` form.

## Environment Test

Use the "Test Environment" button in the UI to validate the adapter config. It checks:

- The `a-coder-cli` command resolves (with best-effort sandbox install for remote targets)
- Working directory is absolute and available
- Model discovery succeeds (`a-coder-cli --list-models`) and the configured model is available
- A live hello probe (`a-coder-cli -p "Respond with hello." --mode json`) verifies provider auth and JSON output end-to-end

## Remote execution

`acoder_local` is a remote-managed adapter: local, `ssh`, and `sandbox` drivers are supported. On remote targets the adapter stages the workspace, a skills snapshot, and any managed provider config to the target before the run, and syncs workspace changes back afterwards (the same no-remote-git contract as the other local adapters). The sandbox install command uses the pinned A-Coder installer script; hosts that cannot reach GitHub releases should pre-install the CLI on the target instead.