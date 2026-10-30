export const type = "acoder_local";
export const label = "A-Coder CLI";

export const SANDBOX_INSTALL_COMMAND =
  "curl -sSf https://raw.githubusercontent.com/hamishfromatech/a-coder-cli/feat/desktop-unified-release/install-a-coder.sh | bash -s -- v0.80.188 --quiet";

export const models: Array<{ id: string; label: string }> = [];

export const agentConfigurationDoc = `# acoder_local agent configuration

Adapter: acoder_local

Use when:
- You want Paperclip to run A-Coder CLI (the self-extensible coding harness) locally as the agent runtime
- You want provider/model routing in A-Coder format (--provider <name> --model <id or provider/id>)
- You want A-Coder session resume across heartbeats via --session JSONL files
- You need A-Coder's coding tool set (read, bash, edit, write, grep, find, ls, skill)

Don't use when:
- You need webhook-style external invocation (use openclaw_gateway or http)
- You only need one-shot shell commands (use process)
- The a-coder-cli binary is not installed on the machine (install with the A-Coder installer script from github.com/hamishfromatech/a-coder-cli)

Core fields:
- cwd (string, optional): default absolute working directory fallback for the agent process (created if missing when possible)
- instructionsFilePath (string, optional): absolute path to a markdown instructions file appended to system prompt via --append-system-prompt
- promptTemplate (string, optional): user prompt template passed via -p flag
- model (string, required): A-Coder model id in provider/model format (for example anthropic/claude-sonnet-4-5)
- thinking (string, optional): thinking level (off, minimal, low, medium, high, xhigh)
- command (string, optional): defaults to "a-coder-cli"
- env (object, optional): KEY=VALUE environment variables (e.g. ANTHROPIC_API_KEY)

Operational fields:
- timeoutSec (number, optional): run timeout in seconds
- graceSec (number, optional): SIGTERM grace period in seconds
- stdoutLogMode (string, optional, default "compact"): controls how A-Coder --mode json stdout is
  compacted before entering the Paperclip run log. A-Coder emits cumulative state
  in every message_update event, which makes run logs grow ~quadratically.
  Modes:
  - "raw": legacy passthrough, no filtering (full transcript; large logs).
  - "compact" (default): strips cumulative copies (message_update.message,
    assistantMessageEvent.partial), converts tool_execution_update to a
    throttled content-free Paperclip progress event. Streaming deltas are
    preserved — parseAcoderJsonl output and live UI typing are unchanged.
  In compact mode, if a run is terminated before tool_execution_end, its
  partial tool output is not retained; use "raw" when full forensic output is required.
  Oversized individual lines are handled by the server's run-log pipeline
  (redaction + head/tail cap) regardless of mode. Invalid explicit mode values
  fail safe to "raw" rather than enabling a lossy transformation.

Notes:
- A-Coder CLI supports many providers and models. Use \`a-coder-cli --list-models\` to list available options.
- Paperclip requires an explicit \`model\` value for \`acoder_local\` agents.
- Sessions are stored in ~/.a-coder/paperclips/ and resumed with --session.
- Tools read, bash, edit, write, grep, find, ls, and skill are enabled via --tools;
  all other built-in tools (ask_user_question, task graph, teams, plan mode, memory) are
  intentionally disabled so headless runs stay deterministic.
- Paperclip skills are injected into the A-Coder skills home (~/.a-coder/cli/agent/skills).
- Agent instructions are appended to A-Coder's system prompt via --append-system-prompt, while the user task is sent via -p.
`;