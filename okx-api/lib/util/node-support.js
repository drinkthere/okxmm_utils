"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signMessage = void 0;
const crypto_1 = require("crypto");
function signMessage(message, secret) {
    return (0, crypto_1.createHmac)('sha256', secret).update(message).digest('base64');
}
exports.signMessage = signMessage;
//# sourceMappingURL=node-support.js.map