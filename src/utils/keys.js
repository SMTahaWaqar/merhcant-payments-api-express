const crypto = require('crypto');
function randomKey() {
  return 'sk_live_' + crypto.randomBytes(16).toString('hex');
}
function maskKey(full) {
  return '••••••••••••••••' + full.slice(-4);
}
module.exports = { randomKey, maskKey };
