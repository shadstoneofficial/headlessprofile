const assert = require('node:assert/strict');
const test = require('node:test');

const {
    availabilityCopy,
    fetchResolver,
    publishedActions,
    startIndependentLoads,
    summarizeAction
} = require('../action-view.js');

function card(overrides = {}) {
    return {
        id: 'powerlobster.service.example',
        display_name: 'View service',
        description: 'Read a public listing.',
        provider: { id: 'powerlobster' },
        invocation: { mode: 'provider_redirect', method: 'GET', authentication: { type: 'none' } },
        authorization: { approval_mode: 'never' },
        trust: { class: 'ownership_verified' },
        payment: { pricing: 'fixed', amount: '2', currency: 'GFA Gems' },
        receipt: { mode: 'none' },
        lifecycle: { status: 'active' },
        ...overrides
    };
}

test('classifies a provider redirect as view-only with descriptive payment', () => {
    const summary = summarizeAction(card());
    assert.equal(summary.behavior, 'View only');
    assert.equal(summary.provider, 'PowerLobster');
    assert.equal(summary.trust, 'Ownership verified');
    assert.equal(summary.authentication, 'No sign-in');
    assert.equal(summary.approval, 'No approval');
    assert.equal(summary.payment, '2 GFA Gems listed');
    assert.equal(summary.receipt, 'No receipt');
});

test('classifies a write action without turning its endpoint into a profile link', () => {
    const summary = summarizeAction(card({
        invocation: { mode: 'direct', method: 'POST', authentication: { type: 'oauth2' } },
        authorization: { approval_mode: 'always' },
        payment: null,
        receipt: { mode: 'delivery_acknowledgement' }
    }));
    assert.equal(summary.behavior, 'Callable');
    assert.equal(summary.authentication, 'Provider sign-in');
    assert.equal(summary.approval, 'Always required');
    assert.equal(summary.payment, 'No payment declared');
    assert.equal(summary.receipt, 'Delivery acknowledgement');
});

test('empty and degraded resolver states preserve website and identity separation', () => {
    assert.match(availabilityCopy({ status: 'success', actions: [] }).text, /website and identity remain independent/i);
    assert.equal(availabilityCopy(null).tone, 'warning');
    assert.equal(availabilityCopy({ status: 'success', actions: [card()] }).tone, 'success');
});

test('non-active resolver cards are omitted defensively from HeadlessProfile', () => {
    const payload = {
        status: 'success',
        actions: [
            card(),
            card({ id: 'suspended.action', lifecycle: { status: 'suspended' } }),
            card({ id: 'deprecated.action', lifecycle: { status: 'deprecated' } }),
            card({ id: 'revoked.action', lifecycle: { status: 'revoked' } })
        ]
    };
    assert.deepEqual(publishedActions(payload).map((action) => action.id), ['powerlobster.service.example']);
    assert.match(availabilityCopy(payload).text, /^1 validated action/);
});

test('canonical actions can finish while TXT profile lookup is stalled', async () => {
    let finishProfile;
    const events = [];
    const loads = startIndependentLoads(
        () => {
            events.push('profile-started');
            return new Promise((resolve) => { finishProfile = resolve; });
        },
        () => {
            events.push('actions-started');
            return { status: 'success', actions: [card()] };
        }
    );
    const actions = await loads.actions;
    assert.deepEqual(events, ['actions-started', 'profile-started']);
    assert.equal(actions.actions.length, 1);
    finishProfile(null);
    assert.equal(await loads.profile, null);
});

test('canonical actions succeed independently when TXT profile lookup fails', async () => {
    const loads = startIndependentLoads(
        () => { throw new Error('TXT unavailable'); },
        () => ({ status: 'success', actions: [card()] })
    );
    assert.equal((await loads.actions).actions.length, 1);
    await assert.rejects(loads.profile, /TXT unavailable/);
});

test('resolver timeout is armed before fetch and cleared after completion', async () => {
    const events = [];
    let timeoutCallback;
    const controller = { signal: {}, abort: () => events.push('aborted') };
    const result = await fetchResolver('lisa.agent', {
        AbortControllerImpl: class { constructor() { return controller; } },
        setTimer: (callback, delay) => {
            events.push(`timer:${delay}`);
            timeoutCallback = callback;
            return 7;
        },
        clearTimer: (id) => events.push(`clear:${id}`),
        fetchImpl: async (_url, options) => {
            events.push(options.signal === controller.signal ? 'fetch-with-signal' : 'fetch-without-signal');
            return { ok: true, json: async () => ({ status: 'success', actions: [card()] }) };
        }
    });
    assert.deepEqual(events, ['timer:5000', 'fetch-with-signal', 'clear:7']);
    assert.equal(result.payload.status, 'success');
    timeoutCallback();
    assert.equal(events.at(-1), 'aborted');
});
