## Your DeepSeek coding agent

Choose DeepSeek in bb and work with Flash or V4 Pro using your own API key. Stream responses, edit project files, run terminal commands, and continue conversations through an OpenCode agent connected over ACP.

## What you get

- A dedicated DeepSeek provider with its own model picker and branding.
- Flash and V4 Pro with Off, Low, High, and Max reasoning controls.
- File and terminal tools supplied by OpenCode.
- Session restore and host-local credential loading.
- Separate OpenCode configuration, data, cache, and state.

## Setup

Install OpenCode 1.19.5 or newer on your execution host. Save a DeepSeek API key in a private dotenv file, then set the absolute file path in the DeepSeek plugin settings. Select DeepSeek in a new thread and choose a model.

## Requirements and limits

Requires bb 0.48.1 or newer, a separate OpenCode installation, and a DeepSeek Platform API account with balance. DeepSeek charges for API usage. Native bb forks, manual compaction, and quota reporting are not exposed. Project OpenCode configuration is disabled for this provider; permissions follow bb's ACP adapter.

Learn more about [DeepSeek's API](https://api-docs.deepseek.com/) and [OpenCode ACP](https://opencode.ai/docs/acp/).
