const crypto = require('crypto');

const secret = 'a7d8e9f2b3c4d5e6f7a8b9c0d1e2f3a4';
const path = 'fit-in/640x640/filters:format(webp):quality(80)/jiheonnibaek/2025-11-26_15-39-45_UTC_3.jpg';

function sign(p) {
    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(p);
    return hmac.digest('base64url');
}

console.log('Path:', path);
console.log('New Signature (signing path as-is):', sign(path));
