---
name: deepseek
description: Configure or troubleshoot the independent DeepSeek provider in BB, its host-local API credentials, OpenCode executable, models, and reasoning controls.
---

# DeepSeek provider

This plugin registers `deepseek` and runs an isolated OpenCode CLI over ACP.

- Configure with `bb plugin config deepseek set envFile /absolute/path/to/credentials.env`.
- The dotenv file on the execution host must contain `DEEPSEEK_API_KEY`.
- Configure the OpenCode 1.19.5+ path with `bb plugin config deepseek set executable /absolute/path/to/opencode` when PATH discovery fails.
- List models with `bb provider models deepseek --json`.
- Model IDs in bb are `deepseek/deepseek-flash` and `deepseek/deepseek-v4-pro`.
- Change the default with `bb plugin config deepseek set model deepseek-v4-pro`.
- Reasoning controls are Off, Low, High, and Max; the ACP Default variant uses High.
- BB inherits Medium before thread dispatch: declare it as supported, then map it to High in the host bridge. Extra High also maps to High; Ultra maps to Max; the API alias Minimal maps to Low.
- API usage is charged to the DeepSeek Platform account.

Never print, request in chat, or copy an API key into provider options, command arguments, diagnostics, or a repository. The plugin reads credentials only on the host. Do not alter other providers or the standalone OpenCode setup to fix this provider.

Project OpenCode configuration is disabled; project AGENTS.md and bb-injected context still apply. Native forks, manual compaction, and quota reporting are not exposed. Permissions use the shared ACP adapter and are not an OS sandbox.
