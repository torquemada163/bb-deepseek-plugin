import { isAbsolute } from 'node:path';
import type { AcpLaunchSpec } from '@get-bb/plugin-sdk/provider-bridge/acp';

export const PROVIDER_ID = 'deepseek';
export const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';
export const MODELS = ['deepseek-flash', 'deepseek-v4-pro'] as const;
export type DeepSeekSettings = { executable: string; envFile: string; baseUrl: string; model: string };

export function readSettings(values: Readonly<Record<string, unknown>>): DeepSeekSettings {
  const str = (key: string, fallback: string) => typeof values[key] === 'string' && values[key].trim() ? values[key].trim() : fallback;
  const config = { executable: str('executable', 'opencode'), envFile: str('envFile', ''), baseUrl: str('baseUrl', DEFAULT_BASE_URL), model: str('model', MODELS[0]) };
  if (config.envFile && !isAbsolute(config.envFile)) throw new Error('DeepSeek: envFile must be an absolute host path.');
  if (/[\r\n\0]/.test(config.executable)) throw new Error('DeepSeek: executable must be a command or absolute path.');
  let url: URL;
  try { url = new URL(config.baseUrl); } catch { throw new Error('DeepSeek: baseUrl must be an HTTPS API URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('DeepSeek: baseUrl must be HTTPS without credentials, query, or fragment.');
  if (!MODELS.includes(config.model as typeof MODELS[number])) throw new Error('DeepSeek: choose deepseek-flash or deepseek-v4-pro.');
  return config;
}

export function launchSpec(config: DeepSeekSettings): AcpLaunchSpec {
  return { displayName: 'DeepSeek', command: config.executable, args: ['acp'], env: {} };
}
export function bridgeOptions(config: DeepSeekSettings) {
  return { acpDialect: 'opencode', acpLaunchSpec: launchSpec(config), deepseekConfig: { ...config } };
}
