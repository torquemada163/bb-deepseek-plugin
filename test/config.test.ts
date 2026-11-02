import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bridgeOptions, readSettings } from '../src/config.js';
import { prepareHostOptions } from '../src/credentials.js';

test('rejects invalid paths, credential URLs, HTTP, unknown models, and executable control characters', () => {
  for (const config of [{ envFile: '.env' }, { baseUrl: 'http://api.deepseek.com' }, { baseUrl: 'https://user:password@api.deepseek.com' }, { baseUrl: 'https://api.deepseek.com?key=secret' }, { baseUrl: 'bad-url' }, { model: 'deepseek-chat' }, { executable: 'opencode\n--yolo' }]) {
    assert.throws(() => readSettings(config));
  }
});

test('the server options contain paths, never credential contents', () => {
  const options = bridgeOptions(readSettings({ envFile: '/private/credentials.env' }));
  assert.equal(options.acpDialect, 'opencode');
  assert.deepEqual(options.acpLaunchSpec.env, {});
  assert.equal('DEEPSEEK_API_KEY' in options, false);
});

test('host loads a key, isolates OpenCode storage, and configures only the current DeepSeek models', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deepseek-test-'));
  const file = join(dir, '.env');
  try {
    writeFileSync(file, 'DEEPSEEK_API_KEY="fixture-secret"\n');
    const options = bridgeOptions(readSettings({ envFile: file }));
    const prepared = prepareHostOptions(options, dir);
    const env = prepared.acpLaunchSpec.env;
    assert.equal(env.BB_DEEPSEEK_API_KEY, 'fixture-secret');
    assert.equal(JSON.stringify(options).includes('fixture-secret'), false);
    assert.equal(env.OPENCODE_CONFIG_CONTENT.includes('fixture-secret'), false);
    const config = JSON.parse(env.OPENCODE_CONFIG_CONTENT);
    assert.deepEqual(config.enabled_providers, ['deepseek']);
    assert.deepEqual(config.provider.deepseek.whitelist, ['deepseek-flash', 'deepseek-v4-pro']);
    assert.equal(config.provider.deepseek.options.apiKey, '{env:BB_DEEPSEEK_API_KEY}');
    for (const name of ['XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME']) assert.ok(env[name].startsWith(join(dir, 'opencode')));
    assert.equal(env.OPENCODE_DISABLE_PROJECT_CONFIG, 'true');
    assert.equal(env.OPENCODE_AUTH_CONTENT, '{}');
    assert.equal(readFileSync(file, 'utf8'), 'DEEPSEEK_API_KEY="fixture-secret"\n');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('credential failures are bounded and do not echo file contents or parser errors', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deepseek-test-'));
  const file = join(dir, '.env');
  try {
    const run = () => prepareHostOptions(bridgeOptions(readSettings({ envFile: file })), dir);
    assert.throws(run, /Cannot read DeepSeek credentials/);
    for (const text of ['OTHER_KEY=do-not-leak', 'DEEPSEEK_API_KEY="line1\nline2"', 'DEEPSEEK_API_KEY=""']) {
      writeFileSync(file, text);
      assert.throws(run, /nonempty, single-line DEEPSEEK_API_KEY/);
    }
    writeFileSync(file, 'DEEPSEEK_API_KEY=do-not-leak' + 'x'.repeat(65536));
    assert.throws(run, /Cannot read DeepSeek credentials/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
