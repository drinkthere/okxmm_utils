"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.neverGuard =
    exports.isConnCountEvent =
    exports.isWsUnsubscribeEvent =
    exports.isWsSubscribeEvent =
    exports.isWsBatchPlaceOrdersEvent =
    exports.isWsLoginEvent =
    exports.isWsErrorEvent =
    exports.isWsDataEvent =
    exports.isWsOpDataEvent =
    exports.isWsEvent =
    exports.isRawAPIResponse =
        void 0;
function isRawAPIResponse(response) {
    if (typeof response !== "object" || !response) {
        return false;
    }
    if ("code" in response && "msg" in response && "data" in response) {
        return true;
    }
    return false;
}
exports.isRawAPIResponse = isRawAPIResponse;
/** Simple type guard that a websocket event extends a known event schema */
function isWsEvent(evtData) {
    if (typeof evtData !== "object" || !evtData) {
        return false;
    }
    if ("event" in evtData) {
        return true;
    }
    return false;
}
exports.isWsEvent = isWsEvent;
function isWsDataEvent(evtData) {
    if (typeof evtData !== "object" || !evtData) {
        return false;
    }
    if ("arg" in evtData && "data" in evtData) {
        return true;
    }
    return false;
}
exports.isWsDataEvent = isWsDataEvent;
function isWsOpDataEvent(evtData) {
    if (typeof evtData !== "object" || !evtData) {
        return false;
    }
    if ("op" in evtData && "data" in evtData) {
        return true;
    }
    return false;
}
exports.isWsOpDataEvent = isWsOpDataEvent;
function isWsErrorEvent(evt) {
    return isWsEvent(evt) && evt.event === "error";
}
exports.isWsErrorEvent = isWsErrorEvent;
/** Usually a response to authenticating over ws */
function isWsLoginEvent(evt) {
    return isWsEvent(evt) && evt.event === "login";
}
exports.isWsLoginEvent = isWsLoginEvent;
/** A response to subscribing to a channel */
function isWsSubscribeEvent(evtData) {
    return isWsEvent(evtData) && evtData.event === "subscribe";
}
exports.isWsSubscribeEvent = isWsSubscribeEvent;
/** A response to batch place order to a channel */
function isWsBatchPlaceOrdersEvent(evtData) {
    return isWsOpDataEvent(evtData) && evtData.op == "batch-orders";
}
exports.isWsBatchPlaceOrdersEvent = isWsBatchPlaceOrdersEvent;
/** A response to unsubscribing from a channel */
function isWsUnsubscribeEvent(evtData) {
    return isWsEvent(evtData) && evtData.event === "unsubscribe";
}
exports.isWsUnsubscribeEvent = isWsUnsubscribeEvent;
/** Information event */
function isConnCountEvent(evtData) {
    return isWsEvent(evtData) && evtData.event === "channel-conn-count";
}
exports.isConnCountEvent = isConnCountEvent;
/** Simple typescript guard never expecting code to reach it (will throw typescript error if called) */
function neverGuard(x, msg) {
    return new Error(`Unhandled value exception "${x}", ${msg}`);
}
exports.neverGuard = neverGuard;
//# sourceMappingURL=typeGuards.js.map
