// DeepSeek's documented OpenAI effort aliases. BB defaults inherited settings
// to medium before provider dispatch, so it must be accepted by registration.
// https://api-docs.deepseek.com/guides/thinking_mode/
export const REASONING_MAP = {
  default: 'high',
  none: 'none',
  minimal: 'low',
  low: 'low',
  medium: 'high',
  high: 'high',
  xhigh: 'high',
  max: 'max',
  ultra: 'max',
} as const;
// minimal is an API alias, not a BB provider picker level.
export const REASONING_LEVELS = ['none', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'] as const;
export const NATIVE_REASONING_LEVELS = ['none', 'low', 'high', 'max'] as const;

export function normalizeReasoningOptions(options: Record<string, unknown>): void {
  const level = options.reasoningLevel;
  if (typeof level === 'string' && Object.hasOwn(REASONING_MAP, level)) {
    options.reasoningLevel = REASONING_MAP[level as keyof typeof REASONING_MAP];
  }
}
