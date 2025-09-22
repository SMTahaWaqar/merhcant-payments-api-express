const { default: axios } = require("axios");
const { buildSignatureHeader } = require("./sign");

/**
 * Sends a single webhook delivery.
 * - url: destination webhook URL
 * - signingSecret: merchant's secret
 * - event: { id, type, created, data }
 * - meta: { eventId, webhookId, attempt, retryFlag }
 * Returns: { ok, status, ms, error }
 */
async function deliverWebhook({ url, signingSecret, event, meta, timeoutMs = 15000 }) {
    const raw = Buffer.from(JSON.stringify(event));
    const sig = buildSignatureHeader(signingSecret, raw);

    const headers = {
        'User-Agent': 'MPD/1.0',
        'Content-Type': 'application/json; charset=utf-8',
        'X-MPD-Event': event.type,
        'X-MPD-Id': event.id,
        'X-MPD-Webhook-Id': meta.webhookId,
        'X-MPD-Retry': meta.retryFlag ? '1' : '0',
        'X-MPD-Signature': sig,
    };

    const started = Date.now();
    try {
        const res = await axios.post(url, raw, {
            headers,
            timeout: timeoutMs,
            validateStatus: () => true,
            maxBodyLength: 1024 * 1024
        });
        const ms = Date.now() - started;
        const ok = res.status >= 200 && res.status < 300;
        return { ok, status: res.status, ms };
    } catch (err) {
        const ms = Date.now() - started;
        return { ok: false, status: 0, ms, error: err.message || 'network error' };
    }
}

module.exports = { deliverWebhook }