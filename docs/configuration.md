# Configuration

Open **Settings → Plugins → DeepSeek** or use `bb plugin config deepseek set <key> <value>`.

| Setting | Default | Meaning |
| --- | --- | --- |
| `executable` | `opencode` | OpenCode 1.19.5+ command or absolute execution-host path |
| `envFile` | empty | Required absolute path to a dotenv file with `DEEPSEEK_API_KEY` |
| `baseUrl` | `https://api.deepseek.com/v1` | HTTPS OpenAI-compatible API endpoint |
| `model` | `deepseek-flash` | Default API ID: `deepseek-flash` or `deepseek-v4-pro` |

The key is sent to the configured API endpoint. Only use an endpoint you trust. Credentials, query strings, and fragments in the endpoint URL are rejected.

## Isolation and secrets

The plugin registers only `deepseek`. It reads the dotenv file in its host bridge process, limits that file to 64 KiB, and requires a nonempty single-line key. It does not pass the key through server settings, provider options, or plugin diagnostics.

The OpenCode child receives the key in its environment. Generated `OPENCODE_CONFIG_CONTENT` refers to `{env:BB_DEEPSEEK_API_KEY}` rather than including the key. OpenCode may retain prompts, responses, and tool output in its own session data; avoid putting secrets into chat.

The plugin uses its persistent host data directory for private XDG config, data, cache, and state roots. Standalone OpenCode login files and configuration are not edited. Project OpenCode config, inherited authentication overrides, automatic model-catalog downloads, and automatic updates are disabled for this provider. Project `AGENTS.md` remains available to the agent.

No key is bundled in the npm package. `.env` files are ignored by Git, except the empty `.env.example` template. Credential paths are host-local: remote browser access does not move your credentials to the browser machine.

## Reasoning compatibility

Both models support Off (thinking disabled), Low, High, and Max. Default uses High. The plugin also accepts bb's inherited `medium` setting at provider registration, then normalizes it to `high` before ACP dispatch on session start, restore, and each turn. `xhigh` maps to `high`; `ultra` to `max`; the API alias `minimal` to `low`.

These mappings follow [DeepSeek's thinking-mode documentation](https://api-docs.deepseek.com/guides/thinking_mode/). The API toggle and effort are separate: Off sends `thinking.type=disabled`; the other modes send `thinking.type=enabled` and the selected `reasoning_effort`.

## Permissions

The provider exposes `accept-edits` and `full` through bb's shared ACP adapter. Workspace writes are allowed in `accept-edits`; terminal commands and access outside the workspace may ask for approval. `full` permits broader actions. These modes are not a kernel sandbox. The plugin passes no bypass flag to OpenCode.

## Troubleshooting

- **Executable missing:** set `executable` to the absolute path of OpenCode on the selected execution host. Check the version; old clients may not support current models.
- **Credentials missing:** use an absolute `envFile` path, check file readability, and ensure the variable is named `DEEPSEEK_API_KEY`.
- **401 / authentication:** check the key on DeepSeek Platform. A web chat login is separate.
- **402 / insufficient balance:** top up the API account.
- **Wrong models:** use OpenCode 1.19.5+ and reload the plugin. API IDs are `deepseek-flash` and `deepseek-v4-pro`; bb adds the `deepseek/` prefix.
- **Proxy or endpoint errors:** check the HTTPS `baseUrl`. The standard endpoint is `https://api.deepseek.com/v1`.
- **Project OpenCode plugins absent:** this provider intentionally uses a private configuration. Configure tools through bb's supported MCP and agent-tool surfaces.

List models with `bb provider models deepseek --json`. Never paste your API key or raw credential files into diagnostic reports.
