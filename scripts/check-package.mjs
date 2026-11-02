import { tmpdir as cacheTmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const [pack] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8', env: { ...process.env, npm_config_cache: process.env.BB_DEEPSEEK_NPM_CACHE ?? cacheTmpdir() + '/bb-deepseek-npm-cache' } }));
const files = new Set(pack.files.map((file) => file.path));
for (const required of ['server.ts', 'host.ts', 'assets/deepseek.svg', 'skills/deepseek/SKILL.md', 'dist/server.js', 'dist/host.js', 'dist/server.meta.json', 'dist/host.meta.json']) {
  assert.ok(files.has(required), `Missing package entry: ${required}`);
}
for (const path of files) {
  if (path === ".env.example") continue;
  assert.ok(!/(^|\/)\.env(?:\.|$)|(^|\/)node_modules\/|\.log$|credentials\.env$/.test(path), `Private file in package: ${path}`);
}
console.log(`Publication contents OK (${files.size} files).`);
