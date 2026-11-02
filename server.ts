import type { BbPluginApi, PluginProviderDeclaration } from '@get-bb/plugin-sdk';
import { REASONING_LEVELS } from './src/reasoning.js';
import { bridgeOptions, DEFAULT_BASE_URL, MODELS, PROVIDER_ID, readSettings } from './src/config.js';

export default async function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    executable: { type: 'string', label: 'OpenCode executable', default: 'opencode', description: 'opencode on PATH, or an absolute path on each execution host. Use OpenCode 1.19.5 or newer.' },
    envFile: { type: 'string', label: 'API key dotenv file', default: '', description: 'Absolute host path to a dotenv file containing DEEPSEEK_API_KEY. The key is read only on the execution host.' },
    baseUrl: { type: 'string', label: 'DeepSeek API URL', default: DEFAULT_BASE_URL, description: 'HTTPS OpenAI-compatible endpoint. Credentials are sent to this endpoint.' },
    model: { type: 'string', label: 'Default model', default: MODELS[0], description: 'deepseek-flash or deepseek-v4-pro. Choose a model per thread in the composer.' },
  });
  let registration: { dispose(): void } | undefined;
  function register(values: Readonly<Record<string, unknown>>) {
    const config = readSettings(values);
    const declaration: PluginProviderDeclaration = {
      id: PROVIDER_ID, displayName: 'DeepSeek', family: 'deepseek', icon: './assets/deepseek.svg',
      strings: {
        signInHint: 'Set the DeepSeek plugin envFile to a host dotenv file containing DEEPSEEK_API_KEY.',
        expiredHint: 'Check your DeepSeek API key and balance, then reload the plugin.',
        installUrl: 'https://opencode.ai/docs/',
        iconTint: { light: '#4D6BFE', dark: '#8CA0FF' },
      },
      experimental_visibility: 'always', experimental_bridgeOptions: bridgeOptions(config),
      maintenance: { health: true, usage: false, installation: false },
      capabilities: {
        supportsServiceTier: false, supportsNativeUserQuestion: false, fork: 'none',
        supportsManualCompaction: false, supportsThreadArchive: false, supportsThreadRename: false,
        permissionModes: ['accept-edits', 'full'], reasoningLevels: [...REASONING_LEVELS],
      },
      completedTurnDisplay: 'flat',
      reasoningLevels: REASONING_LEVELS.map(id => ({ id, label: ({ none: 'Off', minimal: 'Minimal → Low', low: 'Low', medium: 'Medium → High', high: 'High', xhigh: 'Extra High → High', max: 'Max', ultra: 'Ultra → Max' })[id] })),
      composerActions: [],
      models: { scope: 'host', fallback: [] },
      deriveProviderOptions(context) { return bridgeOptions(readSettings(context.settings)); },
    };
    registration?.dispose();
    registration = bb.providers.register(declaration);
  }
  register(await settings.get());
  settings.onChange(next => {
    try { register(next); }
    catch { bb.log.error('Invalid DeepSeek settings; check executable, envFile, baseUrl, and model.'); }
  });
  bb.onDispose(() => registration?.dispose());
}
