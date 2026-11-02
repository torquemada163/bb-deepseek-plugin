import { execFile } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { REASONING_MAP, NATIVE_REASONING_LEVELS } from '../src/reasoning.js';
import { MODELS } from '../src/config.js';

const run = promisify(execFile);
const cases = MODELS.flatMap(model => Object.entries(REASONING_MAP).map(([requested, actual]) => ({ model, requested, actual })));
const selected = process.env.DEEPSEEK_SMOKE_LEVELS?.split(',');
if (selected) { for (let i = cases.length - 1; i >= 0; i--) if (!selected.includes(cases[i].requested)) cases.splice(i, 1); }
const results: Record<string, unknown>[] = [];
async function worker() {
  while (cases.length) {
    const entry = cases.shift()!;
    const started = Date.now();
    try {
      const { stderr } = await run(process.execPath, ['--import', 'tsx', 'scripts/smoke.ts'], {
        env: { ...process.env, DEEPSEEK_SMOKE_MODEL: `deepseek/${entry.model}`, DEEPSEEK_SMOKE_REASONING: entry.requested, DEEPSEEK_SMOKE_INSPECT: '1', DEEPSEEK_SMOKE_TOOLS: (NATIVE_REASONING_LEVELS as readonly string[]).includes(entry.requested) || entry.requested === 'medium' ? '1' : '0' },
        timeout: 300000, maxBuffer: 16384,
      });
      const verified = stderr.split('\n').find(line => line.startsWith('Actual HTTPS parameters: PASS'));
      if (!verified) throw new Error('Missing HTTP parameter verification.');
      results.push({ ...entry, passed: true, tools: (NATIVE_REASONING_LEVELS as readonly string[]).includes(entry.requested) || entry.requested === 'medium', seconds: Math.round((Date.now() - started) / 1000), verification: verified });
      process.stdout.write(`PASS ${entry.model}: ${entry.requested} → ${entry.actual}; completed turns + restore + HTTPS${(NATIVE_REASONING_LEVELS as readonly string[]).includes(entry.requested) || entry.requested === 'medium' ? ' + files' : ''}\n`);
    } catch (error) {
      const failure = error as Error & { stderr?: string };
      // Smoke stderr is deliberately redacted; never serialize child environment.
      results.push({ ...entry, passed: false, error: failure.stderr ?? failure.message });
      process.stdout.write(`FAIL ${entry.model}: ${entry.requested}\n${failure.stderr ?? failure.message}\n`);
    }
  }
}
await Promise.all([worker(), worker()]);
const report = { verifiedAt: new Date().toISOString(), bb: '0.48.1', opencode: '1.19.5', results };
if (process.env.DEEPSEEK_SMOKE_REPORT) writeFileSync(process.env.DEEPSEEK_SMOKE_REPORT, JSON.stringify(report, null, 2) + '\n');
process.stdout.write(`Matrix: ${results.filter(r => r.passed).length}/${results.length} passed\n`);
process.exitCode = results.every(r => r.passed) ? 0 : 1;
