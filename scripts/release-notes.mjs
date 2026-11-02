import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const tag = process.argv[2];
assert.equal(tag, `v${manifest.version}`, 'Release tag must match package.json');
const sections = readFileSync('CHANGELOG.md', 'utf8').split(/^## /m).slice(1);
const index = sections.findIndex(section => section.startsWith(`${manifest.version} — `));
assert.ok(index >= 0, 'A dated changelog entry is required');
const body = sections[index].slice(sections[index].indexOf('\n') + 1).trim();
const previous = sections[index + 1]?.match(/^(\d+\.\d+\.\d+)/)?.[1];
const repository = manifest.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
process.stdout.write(`# DeepSeek for bb ${tag}\n\n${body}\n\n`);
process.stdout.write(`## Install\n\nRequires bb 0.48.1+, OpenCode 1.19.5+, and a DeepSeek Platform API key with balance.\n\n`);
process.stdout.write(`\`\`\`sh\nbb plugin install git:${repository}.git@${tag}\n\`\`\`\n\n`);
process.stdout.write(`For an existing managed Git installation, run \`bb plugin update deepseek\`.\n\n`);
process.stdout.write(`## Checks\n\nTypeScript, credential and configuration tests, public-SDK bridge conformance, a clean production-only install build, and publication content checks run before release. Live API smoke checks are separate and are not run in CI.\n\n`);
process.stdout.write(`[Setup and configuration](${repository}#connect-your-account) · [DeepSeek API documentation](https://api-docs.deepseek.com/)${previous ? ` · [Full changelog](${repository}/compare/v${previous}...${tag})` : ''}\n`);
