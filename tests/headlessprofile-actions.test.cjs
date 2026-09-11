const assert = require('node:assert/strict');
const test = require('node:test');

const { availabilityCopy, summarizeAction } = require('../action-view.js');

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
