import { test } from 'node:test';
import assert from 'node:assert/strict';
import { threadStartParamsSchema, threadResumeParamsSchema, turnStartParamsSchema } from '@get-bb/plugin-sdk/provider-bridge';
import { REASONING_MAP, REASONING_LEVELS, normalizeReasoningOptions } from '../src/reasoning.js';

test('all documented effort aliases normalize before start, resume, and turn dispatch', () => {
  assert.ok(REASONING_LEVELS.includes('medium'));
  for (const model of ['deepseek/deepseek-flash', 'deepseek/deepseek-v4-pro']) {
    for (const [input, expected] of Object.entries(REASONING_MAP)) {
      const options = { model, reasoningLevel: input, permissionMode: 'accept-edits', permissionScope: 'workspace', approvalReviewer: 'user', permissionEscalation: 'deny' };
      normalizeReasoningOptions(options);
      assert.equal(options.reasoningLevel, expected);
      const params = { threadId: 'regression', providerThreadId: 'fixture', cwd: '/tmp', instructionMode: 'append', options };
      assert.equal(threadStartParamsSchema.parse(params).options.reasoningLevel, expected);
      assert.equal(threadResumeParamsSchema.parse(params).options.reasoningLevel, expected);
      assert.equal(turnStartParamsSchema.parse({ ...params, clientRequestId: 'creq_ds23456789', input: [{ type: 'text', text: 'hello', mentions: [] }] }).options.reasoningLevel, expected);
      assert.equal(options.model, model);
    }
  }
});

test('unknown and omitted reasoning values are preserved for SDK validation', () => {
  for (const options of [{}, { reasoningLevel: 'unknown' }, { reasoningLevel: 5 }]) {
    const before = { ...options };
    normalizeReasoningOptions(options);
    assert.deepEqual(options, before);
  }
});
