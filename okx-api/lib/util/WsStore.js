"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsStore = exports.isDeepObjectMatch = exports.WsConnectionStateEnum = void 0;
const logger_1 = require("./logger");
var WsConnectionStateEnum;
(function (WsConnectionStateEnum) {
    WsConnectionStateEnum[WsConnectionStateEnum["INITIAL"] = 0] = "INITIAL";
    WsConnectionStateEnum[WsConnectionStateEnum["CONNECTING"] = 1] = "CONNECTING";
    WsConnectionStateEnum[WsConnectionStateEnum["CONNECTED"] = 2] = "CONNECTED";
    WsConnectionStateEnum[WsConnectionStateEnum["CLOSING"] = 3] = "CLOSING";
    WsConnectionStateEnum[WsConnectionStateEnum["RECONNECTING"] = 4] = "RECONNECTING";
    // ERROR = 5,
})(WsConnectionStateEnum || (exports.WsConnectionStateEnum = WsConnectionStateEnum = {}));
function isDeepObjectMatch(object1, object2) {
    if (typeof object2 !== typeof object1) {
        return false;
    }
    const keys1 = Object.keys(object1).sort();
    const keys2 = Object.keys(object2).sort();
    const hasSameKeyCount = keys1.length === keys2.length;
    if (!hasSameKeyCount) {
        // console.log('not same key count', { keys1, keys2 });
        // not the same amount of keys or keys don't match
        return false;
    }
    const hasSameKeyNames = keys1.every((val, i) => val === keys2[i]);
    if (!hasSameKeyNames) {
        // console.log('not same key names: ', { keys1, keys2 });
        return false;
    }
    for (const key in object1) {
        const value1 = object1[key];
        const value2 = object2[key];
        if (typeof value1 === 'object' && typeof value2 === 'object') {
            if (!isDeepObjectMatch(value1, value2)) {
                return false;
            }
        }
        if (value1 !== value2) {
            return false;
        }
    }
    return true;
}
exports.isDeepObjectMatch = isDeepObjectMatch;
class WsStore {
    constructor(logger) {
        this.wsState = {};
        this.logger = logger || logger_1.DefaultLogger;
        this.wsState = {};
    }
    get(wsKey, createIfMissing) {
        if (this.wsState[wsKey]) {
            return this.wsState[wsKey];
        }
        if (createIfMissing) {
            return this.create(wsKey);
        }
    }
    getKeys() {
        return Object.keys(this.wsState);
    }
    create(wsKey) {
        if (this.hasExistingActiveConnection(wsKey)) {
            this.logger.warning('WsStore setConnection() overwriting existing open connection: ', this.getWs(wsKey));
        }
        this.wsState[wsKey] = {
            subscribedTopics: new Set(),
            connectionState: WsConnectionStateEnum.INITIAL,
        };
        return this.get(wsKey);
    }
    delete(wsKey) {
        if (this.hasExistingActiveConnection(wsKey)) {
            const ws = this.getWs(wsKey);
            this.logger.warning('WsStore deleting state for connection still open: ', ws);
            ws === null || ws === void 0 ? void 0 : ws.close();
        }
        delete this.wsState[wsKey];
    }
    /* connection websocket */
    hasExistingActiveConnection(wsKey) {
        return this.get(wsKey) && this.isWsOpen(wsKey);
    }
    getWs(wsKey) {
        var _a;
        return (_a = this.get(wsKey)) === null || _a === void 0 ? void 0 : _a.ws;
    }
    setWs(wsKey, wsConnection) {
        if (this.isWsOpen(wsKey)) {
            this.logger.warning('WsStore setConnection() overwriting existing open connection: ', this.getWs(wsKey));
        }
        this.get(wsKey, true).ws = wsConnection;
        return wsConnection;
    }
    /* connection state */
    isWsOpen(wsKey) {
        const existingConnection = this.getWs(wsKey);
        return (!!existingConnection &&
            existingConnection.readyState === existingConnection.OPEN);
    }
    getConnectionState(wsKey) {
        return this.get(wsKey, true).connectionState;
    }
    setConnectionState(wsKey, state) {
        this.get(wsKey, true).connectionState = state;
    }
    isConnectionState(wsKey, state) {
        return this.getConnectionState(wsKey) === state;
    }
    /* subscribed topics */
    getTopics(wsKey) {
        return this.get(wsKey, true).subscribedTopics;
    }
    getTopicsByKey() {
        const result = {};
        for (const refKey in this.wsState) {
            result[refKey] = this.getTopics(refKey);
        }
        return result;
    }
    addTopic(wsKey, topic) {
        return this.getTopics(wsKey).add(topic);
    }
    /** Add subscribed topic to store, only if not already subscribed */
    addComplexTopic(wsKey, topic) {
        if (this.getMatchingTopic(wsKey, topic)) {
            return this.getTopics(wsKey);
        }
        // console.log('add complex topic: ', topic);
        return this.getTopics(wsKey).add(topic);
    }
    deleteTopic(wsKey, topic) {
        return this.getTopics(wsKey).delete(topic);
    }
    /** Remove subscribed topic from store */
    deleteComplexTopic(wsKey, topic) {
        const storedTopic = this.getMatchingTopic(wsKey, topic);
        if (storedTopic) {
            this.getTopics(wsKey).delete(storedTopic);
        }
        return this.getTopics(wsKey);
    }
    // Since topics are objects we can't rely on the set to detect duplicates
    getMatchingTopic(key, topic) {
        if (typeof topic === 'string') {
            if (this.getTopics(key).has(topic)) {
                return topic;
            }
            else {
                return undefined;
            }
        }
        const allTopics = this.getTopics(key).values();
        for (const storedTopic of allTopics) {
            // console.log('?: ', {
            //   isMatch: isDeepObjectMatch(topic, storedTopic),
            //   newTopic: topic,
            //   storedTopic: storedTopic,
            // });
            if (isDeepObjectMatch(topic, storedTopic)) {
                return storedTopic;
            }
        }
    }
}
exports.WsStore = WsStore;
//# sourceMappingURL=WsStore.js.map