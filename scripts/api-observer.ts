import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { join } from 'node:path';
import { REASONING_MAP } from '../src/reasoning.js';

/** Opt-in live test observer. Keeps only nonsecret control fields in memory.
 * TLS remains verified on both hops; never log headers, prompts, or responses.
 */
export async function observeApi(directory: string, model: string, requested: string) {
  const keyPath = join(directory, 'tls-key.pem');
  const certPath = join(directory, 'tls-cert.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1', '-keyout', keyPath, '-out', certPath], { stdio: 'ignore' });
  const bundle = join(directory, 'tls-ca.pem');
  writeFileSync(bundle, Buffer.concat([readFileSync(certPath), process.env.NODE_EXTRA_CA_CERTS ? readFileSync(process.env.NODE_EXTRA_CA_CERTS) : Buffer.alloc(0)]));
  const records: { model: string; effort: unknown; thinking: unknown; status: number; auxiliary: boolean }[] = [];
  const server = createServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, async (req, res) => {
    try {
      assert.equal(req.method, 'POST');
      assert.equal(req.url, '/v1/chat/completions');
      const buffers: Buffer[] = [];
      for await (const chunk of req) buffers.push(Buffer.from(chunk));
      const body = Buffer.concat(buffers);
      const input = JSON.parse(body.toString('utf8'));
      const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: req.headers.authorization ?? '' }, body,
        signal: AbortSignal.timeout(120000),
      });
      records.push({ model: input.model, effort: input.reasoning_effort, thinking: input.thinking?.type, status: upstream.status, auxiliary: input.messages.some((m: any) => m.role === 'system' && /^You are a title generator\.|^Summarize what was done in this conversation\./m.test(typeof m.content === 'string' ? m.content : JSON.stringify(m.content))) });
      res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/json' });
      if (upstream.body) for await (const chunk of upstream.body) res.write(chunk);
      res.end();
    } catch { res.destroy(new Error('Live API observer failed.')); }
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const oldCA = process.env.NODE_EXTRA_CA_CERTS;
  process.env.NODE_EXTRA_CA_CERTS = bundle;
  return {
    baseUrl: `https://127.0.0.1:${address.port}/v1`,
    verify() {
      const expected = REASONING_MAP[requested as keyof typeof REASONING_MAP];
      assert.ok(expected, 'Unknown smoke reasoning level.');
      const primary = records.filter(record => !record.auxiliary);
      assert.ok(primary.length >= 2, 'Expected requests from both turns.');
      for (const record of primary) {
        assert.equal(record.status, 200, 'DeepSeek HTTP status');
        assert.equal(record.model, model.replace(/^deepseek\//, ''));
        assert.equal(record.thinking, expected === 'none' ? 'disabled' : 'enabled', 'Actual HTTP thinking toggle');
        if (expected !== 'none') assert.equal(record.effort, expected, 'Actual HTTP reasoning_effort');
      }
      process.stderr.write(`Actual HTTPS parameters: PASS (${primary.length} main requests; ${requested} → ${expected})\n`);
    },
    async close() {
      if (oldCA === undefined) delete process.env.NODE_EXTRA_CA_CERTS; else process.env.NODE_EXTRA_CA_CERTS = oldCA;
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}
