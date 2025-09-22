const crypto = require('crypto');

/**
 * Build X-MPD-Signature header value.
 * Format: "t=<unix>, v1=<hex-hmac>"
 * HMAC_SHA256(secret, `${t}.${rawBody}`)
 */

function buildSignatureHeader (signingSecret, rawBodyBuffer) {
    const t = Math.floor(Date.now() / 1000);
    const h = crypto
        .createHmac('sha256', signingSecret)
        .update(`${t}.${rawBodyBuffer}`)
        .digest('hex');
    return `t=${t}, v1=${h}`;
}

module.exports = { buildSignatureHeader };