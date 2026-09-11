(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.HeadlessActionView = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    const trustLabels = { public_untrusted: 'Public input', self_declared: 'Owner declared', ownership_verified: 'Ownership verified', operationally_verified: 'Operationally verified' };
    const authLabels = { none: 'No sign-in', api_key: 'API key', oauth2: 'Provider sign-in', signed_domain_request: 'Signed request', owner_approval: 'Owner approval', mpp: 'MPP authorization', provider_managed: 'Provider managed' };
    const approvalLabels = { never: 'No approval', always: 'Always required', risk_based: 'Risk based', provider_managed: 'Provider managed' };
    const receiptLabels = { none: 'No receipt', delivery_acknowledgement: 'Delivery acknowledgement', provider_reference: 'Provider reference', status_reference: 'Status reference', signed_receipt: 'Signed receipt' };

    function titleCase(value) {
        return String(value || 'Unknown').replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    }

    function summarizeAction(action) {
        const invocation = action.invocation || {};
        const authorization = action.authorization || {};
        const authentication = invocation.authentication || {};
        const provider = action.provider || {};
        const trust = action.trust || {};
        const payment = action.payment;
        const viewOnly = invocation.method === 'GET' && ['provider_redirect', 'discovery_only'].includes(invocation.mode);
        let paymentLabel = 'No payment declared';
        if (payment) {
            paymentLabel = payment.pricing === 'fixed'
                ? `${payment.amount} ${payment.currency} listed`
                : payment.pricing === 'free' ? 'Provider declares free' : 'Provider determines price';
        }
        return {
            id: action.id,
            name: action.display_name,
            description: action.description,
            behavior: viewOnly ? 'View only' : (invocation.method === 'GET' ? 'Read-only call' : 'Callable'),
            provider: provider.id === 'powerlobster' ? 'PowerLobster' : titleCase(provider.id),
            lifecycle: titleCase((action.lifecycle || {}).status),
            trust: trustLabels[trust.class] || titleCase(trust.class),
            authentication: authLabels[authentication.type] || titleCase(authentication.type),
            approval: approvalLabels[authorization.approval_mode] || titleCase(authorization.approval_mode),
            payment: paymentLabel,
            receipt: receiptLabels[(action.receipt || {}).mode] || titleCase((action.receipt || {}).mode)
        };
    }

    function availabilityCopy(payload) {
        if (!payload || payload.status !== 'success') return { tone: 'warning', text: 'Actions are temporarily unavailable. Use the canonical HeadlessDomains page to check again.' };
        const actions = publishedActions(payload);
        if (!actions.length) return { tone: 'neutral', text: 'No active actions are currently published. The website and identity remain independent and available.' };
        return { tone: 'success', text: `${actions.length} validated action${actions.length === 1 ? '' : 's'} published by the canonical resolver.` };
    }

    function publishedActions(payload) {
        const actions = payload && Array.isArray(payload.actions) ? payload.actions : [];
        return actions.filter((action) => action && action.lifecycle && action.lifecycle.status === 'active');
    }

    function startIndependentLoads(loadProfile, loadActions) {
        const invoke = (loader) => {
            try {
                return Promise.resolve(loader());
            } catch (error) {
                return Promise.reject(error);
            }
        };
        // Arm the bounded canonical resolver request first, then start TXT.
        // Neither result is awaited before the other request begins.
        const actions = invoke(loadActions);
        const profile = invoke(loadProfile);
        return { profile, actions };
    }

    async function fetchResolver(domain, options = {}) {
        const fetchImpl = options.fetchImpl || fetch;
        const AbortControllerImpl = options.AbortControllerImpl || AbortController;
        const setTimer = options.setTimer || setTimeout;
        const clearTimer = options.clearTimer || clearTimeout;
        const timeoutMs = options.timeoutMs || 5000;
        const baseUrl = options.baseUrl || 'https://headlessdomains.com';
        const controller = new AbortControllerImpl();
        const timeout = setTimer(() => controller.abort(), timeoutMs);
        try {
            const response = await fetchImpl(
                `${baseUrl}/api/v1/resolve/${encodeURIComponent(domain)}`,
                { headers: { Accept: 'application/json' }, signal: controller.signal }
            );
            return { response, payload: await response.json() };
        } finally {
            clearTimer(timeout);
        }
    }

    return { availabilityCopy, fetchResolver, publishedActions, startIndependentLoads, summarizeAction };
});
