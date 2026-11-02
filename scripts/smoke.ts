import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { parse } from 'dotenv';
import { experimental_createBridgeJsonRpcTestHarness as harnessFor } from '@get-bb/plugin-sdk/provider-bridge/testing';
import type { ProviderBridgeEntry } from '@get-bb/plugin-sdk/provider-bridge';
import { bridgeOptions, readSettings } from '../src/config.js';
// @ts-expect-error Generated JavaScript has no declaration file.
const { experimental_providerBridge: bridge } = await import('../dist/host.js') as { experimental_providerBridge: ProviderBridgeEntry };

const dir = mkdtempSync(join(tmpdir(), 'bb-deepseek-smoke-'));
const envFile = resolve('.env');
const secret = parse(readFileSync(envFile)).DEEPSEEK_API_KEY;
const redact = (text: string) => secret ? text.split(secret).join('[REDACTED]') : text;
const note = 'NOTE_' + randomBytes(8).toString('hex');
const tools = process.env.DEEPSEEK_SMOKE_TOOLS === '1';
bridge.start?.({ pluginId: 'deepseek', dataDir: dir, tempDir: dir });
const harness = harnessFor(bridge.handleLine);
const providerOptions = bridgeOptions(readSettings({ envFile, executable: process.env.DEEPSEEK_EXECUTABLE ?? resolve('node_modules/opencode-ai/bin/opencode.exe') }));
const options = { model: process.env.DEEPSEEK_SMOKE_MODEL ?? 'deepseek/deepseek-flash', reasoningLevel: process.env.DEEPSEEK_SMOKE_REASONING ?? 'high', permissionMode: 'accept-edits', permissionScope: 'workspace', approvalReviewer: 'user', permissionEscalation: 'deny', providerOptions };
let counter = 0;
let providerThreadId: unknown;
let success = false;
async function request(method: string, params: Record<string, unknown>) {
  const id = `smoke-${++counter}`;
  harness.sendRequest(id, method, params as import('@get-bb/plugin-sdk/provider-bridge/testing').BridgeJsonRpcObject);
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const response = harness.messages.find(m => m.id === id && ('result' in m || 'error' in m));
    if (response) {
      if (response.error) throw new Error(redact(`${method}: ${JSON.stringify(response.error)}`));
      return response.result as Record<string, unknown>;
    }
    await delay(50);
  }
  throw new Error(`Timeout: ${method}`);
}
function deltas(from: number): Record<string, any>[] {
  return harness.messages.slice(from).flatMap((m: any) => m.params?.deltas ?? []);
}
async function turn(text: string, id: string) {
  const from = harness.messages.length;
  await request('turn/start', { threadId: 'deepseek-smoke', providerThreadId, clientRequestId: id, input: [{ type: 'text', text, mentions: [] }], options });
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const boundary = deltas(from).find(d => d.kind === 'turn.boundary');
    if (boundary) {
      assert.equal(boundary.status, 'completed', redact(JSON.stringify(boundary)));
      return deltas(from).filter(d => d.kind === 'item.textDelta' && d.channel === 'agentMessage').map(d => d.text).join('');
    }
    await delay(100);
  }
  throw new Error('Timeout waiting for completed turn.');
}
try {
  await request('initialize', { protocolVersion: 2, client: { name: 'bb-deepseek-smoke', version: '0.1.0' }, grammarVersions: [3, 3] });
  const catalog = await request('model/list', { cwd: dir, providerOptions });
  const available = catalog.models as { id: string; supportedReasoningEfforts: { reasoningEffort: string }[] }[];
  assert.deepEqual(available.map(m => m.id).sort(), ['deepseek/deepseek-flash', 'deepseek/deepseek-v4-pro']);
  for (const m of available) {
    assert.equal(m.supportedReasoningEfforts.some(e => e.reasoningEffort === 'low'), false);
    assert.ok(m.supportedReasoningEfforts.some(e => e.reasoningEffort === 'max'));
  }
  assert.ok(available.some(m => m.id === options.model));
  process.stderr.write(`Catalog PASS; model ${options.model}; reasoning ${options.reasoningLevel}\n`);
  const session = await request('thread/start', { threadId: 'deepseek-smoke', cwd: dir, instructionMode: 'append', options });
  providerThreadId = session.providerThreadId;
  if (tools) writeFileSync(join(dir, 'input.txt'), note);
  const prompt = tools
    ? 'Read input.txt using the file tool, then create output.txt containing exactly the same text. Remember that text as our session note. Reply DEEPSEEK_BB_OK. Do not use terminal commands.'
    : `Remember our session note: ${note}. Reply exactly DEEPSEEK_BB_OK. Do not use tools.`;
  assert.match(await turn(prompt, 'creq_ds23456789'), /DEEPSEEK_BB_OK/);
  if (tools) assert.equal(readFileSync(join(dir, 'output.txt'), 'utf8').trim(), note);
  process.stderr.write(`Real completed turn${tools ? ' and file read/write' : ''}: PASS\n`);
  await request('thread/stop', { threadId: 'deepseek-smoke', providerThreadId, activeTurnId: null, intent: 'release' });
  const resumed = await request('thread/resume', { threadId: 'deepseek-smoke', providerThreadId, cwd: dir, instructionMode: 'append', options });
  providerThreadId = resumed.providerThreadId;
  assert.ok((await turn('Reply with only our session note from the previous turn. Do not use tools or read files.', 'creq_ds2345678a')).includes(note));
  process.stderr.write('Session restore and second completed turn: PASS\n');
  success = true;
} catch (error) {
  process.stderr.write(redact(String(error)) + '\n');
} finally {
  if (providerThreadId) {
    try { await request('thread/stop', { threadId: 'deepseek-smoke', providerThreadId, activeTurnId: null, intent: 'release' }); } catch { /* preserve the original result */ }
  }
  bridge.onClose?.();
  harness.restore();
  rmSync(dir, { recursive: true, force: true });
  process.exit(success ? 0 : 1);
}
