"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWsPong = exports.getRestBaseUrl = exports.programId = exports.programKey = exports.serializeParams = void 0;
function serializeParams(params, method, strict_validation = false) {
    if (!params) {
        return '';
    }
    if (method !== 'GET') {
        return JSON.stringify(params);
    }
    const queryString = Object.keys(params)
        .map((key) => {
        const value = params[key];
        if (strict_validation === true && typeof value === 'undefined') {
            throw new Error('Failed to sign API request due to undefined parameter');
        }
        return `${key}=${value}`;
    })
        .join('&');
    // Prevent trailing `?` if no params are provided
    return queryString ? '?' + queryString : queryString;
}
exports.serializeParams = serializeParams;
exports.programKey = 'tag';
exports.programId = '159881cb7207BCDE';
function getRestBaseUrl(market, restClientOptions) {
    if (restClientOptions.baseUrl) {
        return restClientOptions.baseUrl;
    }
    switch (market) {
        default:
        case 'demo':
        case 'prod': {
            return 'https://www.okx.com';
        }
        case 'aws': {
            return 'https://aws.okx.com';
        }
        case 'colo': {
            return 'https://coloapi1.okx.com';
        }
    }
}
exports.getRestBaseUrl = getRestBaseUrl;
function isWsPong(response) {
    if (response.pong || response.ping) {
        return true;
    }
    return (response.request &&
        response.request.op === 'ping' &&
        response.ret_msg === 'pong' &&
        response.success === true);
}
exports.isWsPong = isWsPong;
//# sourceMappingURL=requestUtils.js.map