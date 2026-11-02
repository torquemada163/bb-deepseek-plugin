import { readFileSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'dotenv';
import { readSettings, launchSpec, MODELS } from './config.js';

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** Host process only. Never return this object through server RPC or diagnostics. */
export function prepareHostOptions(options: Record<string, unknown>, dataDir: string) {
  const config = readSettings(asRecord(options.deepseekConfig));
  if (!config.envFile) throw new Error('Set DeepSeek envFile to an absolute dotenv path containing DEEPSEEK_API_KEY.');
  let key: string | undefined;
  try {
    const stat = statSync(config.envFile);
    if (!stat.isFile() || stat.size > 65536) throw new Error();
    key = parse(readFileSync(config.envFile)).DEEPSEEK_API_KEY?.trim();
  } catch { throw new Error('Cannot read DeepSeek credentials. Check envFile and file permissions on the execution host.'); }
  if (!key || /[\r\n\0]/.test(key)) throw new Error('The dotenv file must contain a nonempty, single-line DEEPSEEK_API_KEY.');
  const root = join(dataDir, 'opencode');
  const env: Record<string, string> = {};
  for (const [name, folder] of Object.entries({ XDG_CONFIG_HOME: 'config', XDG_DATA_HOME: 'data', XDG_CACHE_HOME: 'cache', XDG_STATE_HOME: 'state' })) {
    env[name] = join(root, folder);
    mkdirSync(env[name], { recursive: true, mode: 0o700 });
  }
  const models = Object.fromEntries(MODELS.map(id => [id, {
    name: id === 'deepseek-flash' ? 'DeepSeek Flash' : 'DeepSeek V4 Pro',
    limit: { context: 1048576, output: 393216 },
    reasoning: true, tool_call: true,
    options: { thinking: { type: 'enabled' }, reasoningEffort: 'high' },
    variants: {
      low: { disabled: true },
      high: { thinking: { type: 'enabled' }, reasoningEffort: 'high' },
      max: { thinking: { type: 'enabled' }, reasoningEffort: 'max' },
    },
  }]));
  const agentConfig = {
    $schema: 'https://opencode.ai/config.json',
    model: `deepseek/${config.model}`,
    small_model: `deepseek/${config.model}`,
    enabled_providers: ['deepseek'],
    provider: { deepseek: { npm: '@ai-sdk/openai-compatible', name: 'DeepSeek', whitelist: [...MODELS], options: { apiKey: '{env:BB_DEEPSEEK_API_KEY}', baseURL: config.baseUrl }, models } },
    autoupdate: false, share: 'disabled',
  };
  Object.assign(env, {
    BB_DEEPSEEK_API_KEY: key,
    DEEPSEEK_API_KEY: key,
    OPENCODE_CONFIG: '', OPENCODE_CONFIG_DIR: env.XDG_CONFIG_HOME,
    OPENCODE_CONFIG_CONTENT: JSON.stringify(agentConfig),
    OPENCODE_DISABLE_PROJECT_CONFIG: 'true', OPENCODE_DISABLE_CLAUDE_CODE: 'true',
    OPENCODE_DISABLE_AUTOUPDATE: 'true', OPENCODE_DISABLE_MODELS_FETCH: 'true',
    OPENCODE_DISABLE_DEFAULT_PLUGINS: 'true', OPENCODE_DISABLE_FILEWATCHER: 'true',
    OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER: 'true',
    npm_config_cache: join(root, 'npm-cache'),
    OPENCODE_AUTH_CONTENT: '{}',
  });
  return { ...options, acpLaunchSpec: { ...launchSpec(config), env } };
}
