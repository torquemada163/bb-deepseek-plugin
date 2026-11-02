import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakePluginHost } from '@get-bb/plugin-sdk/testing';
import plugin from '../server.js';

test('registers only DeepSeek and propagates settings without credentials', async () => {
  const { bb, harness } = createFakePluginHost({ pluginId: 'deepseek' });
  try {
    await plugin(bb);
    const provider = harness.registrations.providerRegistrations.find(p => p.id === 'deepseek');
    assert.ok(provider);
    assert.equal(harness.registrations.providerRegistrations.length, 1);
    assert.equal(provider.displayName, 'DeepSeek');
    assert.deepEqual(provider.capabilities.permissionModes, ['accept-edits', 'full']);
    await harness.behavior.setSettings({ envFile: '/tmp/deepseek.env', model: 'deepseek-v4-pro' });
    const updated = harness.registrations.providerRegistrations.find(p => p.id === 'deepseek');
    assert.ok(updated);
    const options = updated.experimental_bridgeOptions as Record<string, any>;
    assert.equal(options.deepseekConfig.model, 'deepseek-v4-pro');
    assert.deepEqual(options.acpLaunchSpec.env, {});
    await harness.behavior.setSettings({ baseUrl: 'http://unsafe.example' });
    assert.equal(harness.registrations.providerRegistrations.find(p => p.id === 'deepseek'), updated);
  } finally { await harness.lifecycle.dispose(); }
});
