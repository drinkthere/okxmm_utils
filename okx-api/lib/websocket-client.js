"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected);
            }
            step(
                (generator = generator.apply(thisArg, _arguments || [])).next()
            );
        });
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketClient = void 0;
const events_1 = require("events");
const isomorphic_ws_1 = __importDefault(require("isomorphic-ws"));
const node_support_1 = require("./util/node-support");
const util_1 = require("./util");
const websocket_util_1 = require("./util/websocket-util");
const loggerCategory = { category: "okx-ws" };
class WebsocketClient extends events_1.EventEmitter {
    constructor(options, logger) {
        super();
        this.logger = logger || util_1.DefaultLogger;
        this.wsStore = new util_1.WsStore(this.logger);
        this.options = Object.assign(
            {
                market: "prod",
                pongTimeout: 2000,
                pingInterval: 10000,
                reconnectTimeout: 500,
            },
            options
        );
        // add default error handling so this doesn't crash node (if the user didn't set a handler)
        this.on("error", () => {});
    }
    /**
     * Subscribe to topics & track/persist them. They will be automatically resubscribed to if the connection drops/reconnects.
     * @param wsEvents topic or list of topics
     * @param isPrivateTopic optional - the library will try to detect private topics, you can use this to mark a topic as private (if the topic isn't recognised yet)
     */
    subscribe(wsEvents, isPrivateTopic) {
        const wsEventArgs = Array.isArray(wsEvents) ? wsEvents : [wsEvents];
        wsEventArgs.forEach((wsEventArg) => {
            const wsKey = (0, util_1.getWsKeyForTopicChannel)(
                this.options.market,
                wsEventArg.channel,
                isPrivateTopic
            );
            // Persist topic for reconnects
            this.wsStore.addComplexTopic(wsKey, wsEventArg);
            // if connected, send subscription request
            if (
                this.wsStore.isConnectionState(
                    wsKey,
                    util_1.WsConnectionStateEnum.CONNECTED
                )
            ) {
                return this.requestSubscribeTopics(wsKey, [wsEventArg]);
            }
            // start connection process if it hasn't yet begun. Topics are automatically subscribed to on-connect
            if (
                !this.wsStore.isConnectionState(
                    wsKey,
                    util_1.WsConnectionStateEnum.CONNECTING
                ) &&
                !this.wsStore.isConnectionState(
                    wsKey,
                    util_1.WsConnectionStateEnum.RECONNECTING
                )
            ) {
                return this.connect(wsKey);
            }
        });
    }
    /**
     * Unsubscribe from topics & remove them from memory. They won't be re-subscribed to if the connection reconnects.
     * @param wsTopics topic or list of topics
     * @param isPrivateTopic optional - the library will try to detect private topics, you can use this to mark a topic as private (if the topic isn't recognised yet)
     */
    unsubscribe(wsTopics, isPrivateTopic) {
        const wsEventArgs = Array.isArray(wsTopics) ? wsTopics : [wsTopics];
        wsEventArgs.forEach((wsEventArg) => {
            const wsKey = (0, util_1.getWsKeyForTopicChannel)(
                this.options.market,
                wsEventArg.channel,
                isPrivateTopic
            );
            // Remove topic from persistence for reconnects
            this.wsStore.deleteComplexTopic(wsKey, wsEventArg);
            // unsubscribe request only necessary if active connection exists
            if (
                this.wsStore.isConnectionState(
                    wsKey,
                    util_1.WsConnectionStateEnum.CONNECTED
                )
            ) {
                this.requestUnsubscribeTopics(wsKey, [wsEventArg]);
            }
        });
    }
    /** Get the WsStore that tracks websocket & topic state */
    getWsStore() {
        return this.wsStore;
    }
    close(wsKey, force) {
        this.logger.info(
            "Closing connection",
            Object.assign(Object.assign({}, loggerCategory), { wsKey })
        );
        this.wsStore.setConnectionState(
            wsKey,
            util_1.WsConnectionStateEnum.CLOSING
        );
        this.clearTimers(wsKey);
        const ws = this.wsStore.getWs(wsKey);
        ws === null || ws === void 0 ? void 0 : ws.close();
        if (force) {
            ws === null || ws === void 0 ? void 0 : ws.terminate();
        }
    }
    closeAll(force) {
        const keys = this.wsStore.getKeys();
        this.logger.info(`Closing all ws connections: ${keys}`);
        keys.forEach((key) => {
            this.close(key, force);
        });
    }
    /**
     * Request connection of all dependent (public & private) websockets, instead of waiting for automatic connection by library
     */
    connectAll() {
        return [this.connectPublic(), this.connectPrivate()];
    }
    connectPublic(businessEndpoint) {
        const isPrivate = false;
        const wsKey = (0, websocket_util_1.getWsKeyForMarket)(
            this.options.market,
            isPrivate,
            !!businessEndpoint
        );
        return this.connect(util_1.WS_KEY_MAP[wsKey]);
    }
    connectPrivate(businessEndpoint) {
        const isPrivate = true;
        const wsKey = (0, websocket_util_1.getWsKeyForMarket)(
            this.options.market,
            isPrivate,
            !!businessEndpoint
        );
        return this.connect(util_1.WS_KEY_MAP[wsKey]);
    }
    connect(wsKey) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.wsStore.isWsOpen(wsKey)) {
                    this.logger.error(
                        "Refused to connect to ws with existing active connection",
                        Object.assign(Object.assign({}, loggerCategory), {
                            wsKey,
                        })
                    );
                    return this.wsStore.getWs(wsKey);
                }
                if (
                    this.wsStore.isConnectionState(
                        wsKey,
                        util_1.WsConnectionStateEnum.CONNECTING
                    )
                ) {
                    this.logger.error(
                        "Refused to connect to ws, connection attempt already active",
                        Object.assign(Object.assign({}, loggerCategory), {
                            wsKey,
                        })
                    );
                    return;
                }
                if (
                    !this.wsStore.getConnectionState(wsKey) ||
                    this.wsStore.isConnectionState(
                        wsKey,
                        util_1.WsConnectionStateEnum.INITIAL
                    )
                ) {
                    this.wsStore.setConnectionState(
                        wsKey,
                        util_1.WsConnectionStateEnum.CONNECTING
                    );
                }
                const url = (0, websocket_util_1.getWsUrlForWsKey)(
                    wsKey,
                    this.options
                );
                const ws = this.connectToWsUrl(url, wsKey);
                return this.wsStore.setWs(wsKey, ws);
            } catch (err) {
                this.parseWsError("Connection failed", err, wsKey);
                this.reconnectWithDelay(wsKey, this.options.reconnectTimeout);
            }
        });
    }
    parseWsError(context, error, wsKey) {
        if (!error.message) {
            this.logger.error(`${context} due to unexpected error: `, error);
            this.emit("error", error);
            return;
        }
        switch (error.message) {
            default:
                if (
                    this.wsStore.getConnectionState(wsKey) !==
                    util_1.WsConnectionStateEnum.CLOSING
                ) {
                    this.logger.error(
                        `${context} due to unexpected response error: "${
                            (error === null || error === void 0
                                ? void 0
                                : error.msg) ||
                            (error === null || error === void 0
                                ? void 0
                                : error.message) ||
                            error
                        }"`,
                        Object.assign(Object.assign({}, loggerCategory), {
                            wsKey,
                            error,
                        })
                    );
                    this.executeReconnectableClose(
                        wsKey,
                        "unhandled onWsError"
                    );
                } else {
                    this.logger.info(
                        `${wsKey} socket forcefully closed. Will not reconnect.`
                    );
                }
                break;
        }
        this.emit("error", error);
    }
    /**
     * Return params required to make authorized request
     */
    getWsAuthRequest(wsKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const isPublicWsKey = util_1.PUBLIC_WS_KEYS.includes(wsKey);
            const accounts = this.options.accounts;
            const hasAccountsToAuth = !!(accounts === null ||
            accounts === void 0
                ? void 0
                : accounts.length);
            if (isPublicWsKey || !accounts || !hasAccountsToAuth) {
                this.logger.debug(
                    "Starting public only websocket client.",
                    Object.assign(Object.assign({}, loggerCategory), {
                        wsKey,
                        isPublicWsKey,
                        hasAccountsToAuth,
                    })
                );
                return;
            }
            try {
                const authAccountRequests = accounts.map((credentials) =>
                    __awaiter(this, void 0, void 0, function* () {
                        try {
                            const { signature, timestamp } =
                                yield this.getWsAuthSignature(
                                    wsKey,
                                    credentials
                                );
                            return {
                                apiKey: credentials.apiKey,
                                passphrase: credentials.apiPass,
                                timestamp: timestamp,
                                sign: signature,
                            };
                        } catch (e) {
                            this.logger.error(
                                `Account with key ${credentials.apiKey} could not be authenticateD: ${e}`
                            );
                        }
                        return;
                    })
                );
                const signedAuthAccountRequests = yield Promise.all(
                    authAccountRequests
                );
                // Filter out failed accounts
                const authRequests = signedAuthAccountRequests.filter(
                    (request) => !!request
                );
                const authParams = {
                    op: "login",
                    args: authRequests,
                };
                return authParams;
            } catch (e) {
                this.logger.error(
                    e,
                    Object.assign(Object.assign({}, loggerCategory), { wsKey })
                );
                return;
            }
        });
    }
    getWsAuthSignature(wsKey, credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            const { apiKey, apiSecret } = credentials;
            if (!apiKey || !apiSecret) {
                this.logger.warning(
                    "Cannot authenticate websocket, either api or secret missing.",
                    Object.assign(Object.assign({}, loggerCategory), { wsKey })
                );
                throw new Error(
                    `Cannot auth - missing api or secret in config (key: ${apiKey})`
                );
            }
            this.logger.debug(
                "Getting auth'd request params",
                Object.assign(Object.assign({}, loggerCategory), { wsKey })
            );
            const timestamp = (Date.now() / 1000).toFixed(0);
            // const signatureExpiresAt = timestamp + 5;
            const signatureRequest = timestamp + "GET" + "/users/self/verify";
            const signature = yield (0, node_support_1.signMessage)(
                signatureRequest,
                apiSecret
            );
            return {
                signature,
                timestamp,
            };
        });
    }
    sendAuthRequest(wsKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const logContext = Object.assign(
                Object.assign({}, loggerCategory),
                { wsKey, method: "sendAuthRequest" }
            );
            this.logger.info(`Sending auth request...`, logContext);
            try {
                const authRequest = yield this.getWsAuthRequest(wsKey);
                if (!authRequest) {
                    throw new Error("Cannot authenticate this connection");
                }
                this.logger.info(
                    `Sending authentication request on wsKey(${wsKey})`,
                    logContext
                );
                this.logger.silly(
                    `Authenticating with event: ${JSON.stringify(
                        authRequest,
                        null,
                        2
                    )} on wsKey(${wsKey})`,
                    logContext
                );
                return this.tryWsSend(wsKey, JSON.stringify(authRequest));
            } catch (e) {
                this.logger.error(e, logContext);
            }
        });
    }
    reconnectWithDelay(wsKey, connectionDelayMs) {
        var _a;
        this.clearTimers(wsKey);
        if (
            this.wsStore.getConnectionState(wsKey) !==
            util_1.WsConnectionStateEnum.CONNECTING
        ) {
            this.wsStore.setConnectionState(
                wsKey,
                util_1.WsConnectionStateEnum.RECONNECTING
            );
        }
        if (
            (_a = this.wsStore.get(wsKey)) === null || _a === void 0
                ? void 0
                : _a.activeReconnectTimer
        ) {
            this.clearReconnectTimer(wsKey);
        }
        this.wsStore.get(wsKey, true).activeReconnectTimer = setTimeout(() => {
            this.logger.info(
                "Reconnecting to websocket",
                Object.assign(Object.assign({}, loggerCategory), { wsKey })
            );
            this.clearReconnectTimer(wsKey);
            this.connect(wsKey);
        }, connectionDelayMs);
    }
    ping(wsKey) {
        if (this.wsStore.get(wsKey, true).activePongTimer) {
            return;
        }
        this.clearPongTimer(wsKey);
        this.logger.silly(
            "Sending ping",
            Object.assign(Object.assign({}, loggerCategory), { wsKey })
        );
        this.tryWsSend(wsKey, "ping");
        this.wsStore.get(wsKey, true).activePongTimer = setTimeout(
            () => this.executeReconnectableClose(wsKey, "Pong timeout"),
            this.options.pongTimeout
        );
    }
    /**
     * Closes a connection, if it's even open. If open, this will trigger a reconnect asynchronously.
     * If closed, trigger a reconnect immediately
     */
    executeReconnectableClose(wsKey, reason) {
        var _a;
        this.logger.info(
            `${reason} - closing socket to reconnect`,
            Object.assign(Object.assign({}, loggerCategory), { wsKey, reason })
        );
        const wasOpen = this.wsStore.isWsOpen(wsKey);
        (_a = this.wsStore.getWs(wsKey)) === null || _a === void 0
            ? void 0
            : _a.terminate();
        delete this.wsStore.get(wsKey, true).activePongTimer;
        this.clearPingTimer(wsKey);
        this.clearPongTimer(wsKey);
        if (!wasOpen) {
            this.logger.info(
                `${reason} - socket already closed - trigger immediate reconnect`,
                Object.assign(Object.assign({}, loggerCategory), {
                    wsKey,
                    reason,
                })
            );
            this.reconnectWithDelay(wsKey, this.options.reconnectTimeout);
        }
    }
    clearTimers(wsKey) {
        this.clearPingTimer(wsKey);
        this.clearPongTimer(wsKey);
        this.clearReconnectTimer(wsKey);
    }
    // Send a ping at intervals
    clearPingTimer(wsKey) {
        const wsState = this.wsStore.get(wsKey);
        if (
            wsState === null || wsState === void 0
                ? void 0
                : wsState.activePingTimer
        ) {
            clearInterval(wsState.activePingTimer);
            wsState.activePingTimer = undefined;
        }
    }
    // Expect a pong within a time limit
    clearPongTimer(wsKey) {
        const wsState = this.wsStore.get(wsKey);
        if (
            wsState === null || wsState === void 0
                ? void 0
                : wsState.activePongTimer
        ) {
            clearTimeout(wsState.activePongTimer);
            wsState.activePongTimer = undefined;
        }
    }
    clearReconnectTimer(wsKey) {
        const wsState = this.wsStore.get(wsKey);
        if (
            wsState === null || wsState === void 0
                ? void 0
                : wsState.activeReconnectTimer
        ) {
            clearTimeout(wsState.activeReconnectTimer);
            wsState.activeReconnectTimer = undefined;
        }
    }
    /**
     * @private Use the `subscribe(topics)` method to subscribe to topics. Send WS message to subscribe to topics.
     */
    requestSubscribeTopics(wsKey, topics) {
        if (!topics.length) {
            return;
        }
        const maxTopicsPerEvent = (0, util_1.getMaxTopicsPerSubscribeEvent)(
            this.options.market
        );
        if (maxTopicsPerEvent && topics.length > maxTopicsPerEvent) {
            this.logger.silly(
                `Subscribing to topics in batches of ${maxTopicsPerEvent}`
            );
            for (var i = 0; i < topics.length; i += maxTopicsPerEvent) {
                const batch = topics.slice(i, i + maxTopicsPerEvent);
                this.logger.silly(`Subscribing to batch of ${batch.length}`);
                this.requestSubscribeTopics(wsKey, batch);
            }
            this.logger.silly(
                `Finished batch subscribing to ${topics.length} topics`
            );
            return;
        }
        const request = {
            op: "subscribe",
            args: topics,
        };
        const wsMessage = JSON.stringify(request);
        this.tryWsSend(wsKey, wsMessage);
    }
    /**
     * @private Use the `unsubscribe(topics)` method to unsubscribe from topics. Send WS message to unsubscribe from topics.
     */
    requestUnsubscribeTopics(wsKey, topics) {
        if (!topics.length) {
            return;
        }
        const maxTopicsPerEvent = (0, util_1.getMaxTopicsPerSubscribeEvent)(
            this.options.market
        );
        if (maxTopicsPerEvent && topics.length > maxTopicsPerEvent) {
            this.logger.silly(
                `Unsubscribing to topics in batches of ${maxTopicsPerEvent}`
            );
            for (var i = 0; i < topics.length; i += maxTopicsPerEvent) {
                const batch = topics.slice(i, i + maxTopicsPerEvent);
                this.logger.silly(`Unsubscribing to batch of ${batch.length}`);
                this.requestUnsubscribeTopics(wsKey, batch);
            }
            this.logger.silly(
                `Finished batch unsubscribing to ${topics.length} topics`
            );
            return;
        }
        const request = {
            op: "unsubscribe",
            args: topics,
        };
        const wsMessage = JSON.stringify(request);
        this.tryWsSend(wsKey, wsMessage);
    }
    placeOrder(request) {
        const wsKey = (0, websocket_util_1.getWsKeyForMarket)(
            this.options.market,
            true,
            false
        );
        // if connected, send subscription request
        if (
            this.wsStore.isConnectionState(
                wsKey,
                util_1.WsConnectionStateEnum.CONNECTED
            )
        ) {
            const wsMessage = JSON.stringify(request);
            return this.tryWsSend(wsKey, wsMessage);
        }
        // start connection process if it hasn't yet begun. Topics are automatically subscribed to on-connect
        if (
            !this.wsStore.isConnectionState(
                wsKey,
                util_1.WsConnectionStateEnum.CONNECTING
            ) &&
            !this.wsStore.isConnectionState(
                wsKey,
                util_1.WsConnectionStateEnum.RECONNECTING
            )
        ) {
            return this.connect(wsKey);
        }
        //console.log(this.wsStore.isConnectionState(wsKey, util_1.WsConnectionStateEnum.CONNECTED), this.wsStore.isConnectionState(wsKey, util_1.WsConnectionStateEnum.CONNECTING),this.wsStore.isConnectionState(wsKey, util_1.WsConnectionStateEnum.RECONNECTING) )
    }

    cancelOrder(request) {
        const wsKey = (0, websocket_util_1.getWsKeyForMarket)(
            this.options.market,
            true,
            false
        );
        // if connected, send subscription request
        if (
            this.wsStore.isConnectionState(
                wsKey,
                util_1.WsConnectionStateEnum.CONNECTED
            )
        ) {
            const wsMessage = JSON.stringify(request);
            return this.tryWsSend(wsKey, wsMessage);
        }
        // start connection process if it hasn't yet begun. Topics are automatically subscribed to on-connect
        if (
            !this.wsStore.isConnectionState(
                wsKey,
                util_1.WsConnectionStateEnum.CONNECTING
            ) &&
            !this.wsStore.isConnectionState(
                wsKey,
                util_1.WsConnectionStateEnum.RECONNECTING
            )
        ) {
            return this.connect(wsKey);
        }
        //console.log(this.wsStore.isConnectionState(wsKey, util_1.WsConnectionStateEnum.CONNECTED), this.wsStore.isConnectionState(wsKey, util_1.WsConnectionStateEnum.CONNECTING),this.wsStore.isConnectionState(wsKey, util_1.WsConnectionStateEnum.RECONNECTING) )
    }

    tryWsSend(wsKey, wsMessage) {
        try {
            this.logger.silly(
                `Sending upstream ws message: `,
                Object.assign(Object.assign({}, loggerCategory), {
                    wsMessage,
                    wsKey,
                })
            );
            if (!wsKey) {
                throw new Error(
                    `Cannot send message (wsKey not provided: wsKey(${wsKey}))`
                );
            }
            const ws = this.wsStore.getWs(wsKey);
            if (!ws) {
                throw new Error(
                    `${wsKey} socket not connected yet, call "connect(${wsKey}) first then try again when the "open" event arrives`
                );
            }
            ws.send(wsMessage);
        } catch (e) {
            this.logger.error(
                `Failed to send WS message`,
                Object.assign(Object.assign({}, loggerCategory), {
                    wsMessage,
                    wsKey,
                    exception: e,
                })
            );
        }
    }
    connectToWsUrl(url, wsKey) {
        var _a;
        this.logger.silly(
            `Opening WS connection to URL: ${url}`,
            Object.assign(Object.assign({}, loggerCategory), { wsKey })
        );
        const agent =
            (_a = this.options.requestOptions) === null || _a === void 0
                ? void 0
                : _a.agent;
        const ws = new isomorphic_ws_1.default(
            url,
            undefined,
            agent ? { agent } : undefined
        );
        ws.onopen = (event) => this.onWsOpen(event, wsKey);
        ws.onmessage = (event) => this.onWsMessage(event, wsKey);
        ws.onerror = (event) =>
            this.parseWsError("Websocket onWsError", event, wsKey);
        ws.onclose = (event) => this.onWsClose(event, wsKey);
        return ws;
    }
    onWsOpen(event, wsKey) {
        return __awaiter(this, void 0, void 0, function* () {
            if (
                this.wsStore.isConnectionState(
                    wsKey,
                    util_1.WsConnectionStateEnum.CONNECTING
                )
            ) {
                this.logger.info(
                    "Websocket connected",
                    Object.assign(Object.assign({}, loggerCategory), {
                        wsKey,
                        market: this.options.market,
                    })
                );
                this.emit("open", { wsKey, event });
            } else if (
                this.wsStore.isConnectionState(
                    wsKey,
                    util_1.WsConnectionStateEnum.RECONNECTING
                )
            ) {
                this.logger.info(
                    "Websocket reconnected",
                    Object.assign(Object.assign({}, loggerCategory), { wsKey })
                );
                this.emit("reconnected", { wsKey, event });
            }
            this.wsStore.setConnectionState(
                wsKey,
                util_1.WsConnectionStateEnum.CONNECTED
            );
            this.wsStore.get(wsKey, true).activePingTimer = setInterval(
                () => this.ping(wsKey),
                this.options.pingInterval
            );
            // Private websockets require an auth packet to be sent after opening the connection
            if (util_1.PRIVATE_WS_KEYS.includes(wsKey)) {
                // Any requested private topics will be subscribed to once authentication succeeds (in onWsMessage handler)
                yield this.sendAuthRequest(wsKey);
                // Private topics will be subscribed to once authentication is confirmed as successful
                return;
            }
            // Public topics can be subscribed to immediately
            const topics = [...this.wsStore.getTopics(wsKey)];
            // Since public channels have their own ws key, these topics must be public ones already
            this.requestSubscribeTopics(wsKey, topics);
        });
    }
    onWsMessage(event, wsKey) {
        const logContext = Object.assign(Object.assign({}, loggerCategory), {
            wsKey,
            method: "onWsMessage",
        });
        try {
            // any message can clear the pong timer - wouldn't get a message if the ws dropped
            this.clearPongTimer(wsKey);
            if ((0, util_1.isWsPong)(event)) {
                this.logger.silly("Received pong", logContext);
                return;
            }
            const msg = JSON.parse(
                (event === null || event === void 0 ? void 0 : event.data) ||
                    event
            );
            if ((0, util_1.isWsErrorEvent)(msg)) {
                this.logger.error(
                    `WS error event: `,
                    Object.assign(Object.assign({}, msg), { wsKey })
                );
                return this.emit(
                    "error",
                    Object.assign(Object.assign({}, msg), { wsKey })
                );
            }
            if ((0, util_1.isWsDataEvent)(msg)) {
                return this.emit(
                    "update",
                    Object.assign(Object.assign({}, msg), { wsKey })
                );
            }
            if ((0, util_1.isWsDataEvent)(msg)) {
                return this.emit(
                    "update",
                    Object.assign(Object.assign({}, msg), { wsKey })
                );
            }
            if ((0, util_1.isWsLoginEvent)(msg)) {
                // Successfully authenticated
                if (msg.code === websocket_util_1.WS_EVENT_CODE_ENUM.OK) {
                    this.logger.info(
                        `Authenticated successfully on wsKey(${wsKey})`,
                        logContext
                    );
                    this.emit(
                        "response",
                        Object.assign(Object.assign({}, msg), { wsKey })
                    );
                    const topics = [...this.wsStore.getTopics(wsKey)];
                    // Since private topics have a dedicated WsKey, these are automatically all private topics (no filtering required before the subscribe call)
                    this.requestSubscribeTopics(wsKey, topics);
                    return;
                }
                this.logger.error(
                    `Authentication failed: `,
                    Object.assign(
                        Object.assign(Object.assign({}, logContext), msg),
                        { wsKey }
                    )
                );
                return this.emit(
                    "error",
                    Object.assign(Object.assign({}, msg), { wsKey })
                );
            }
            if (
                (0, util_1.isWsSubscribeEvent)(msg) ||
                (0, util_1.isWsUnsubscribeEvent)(msg) ||
                (0, util_1.isWsBatchPlaceOrdersEvent)(msg)
            ) {
                // this.logger.silly(`Ws subscribe reply:`, { ...msg, wsKey });
                return this.emit(
                    "response",
                    Object.assign(Object.assign({}, msg), { wsKey })
                );
            }

            if ((0, util_1.isConnCountEvent)(msg)) {
                return this.emit(
                    "response",
                    Object.assign(Object.assign({}, msg), { wsKey })
                );
            }
            this.logger.error(
                "Unhandled/unrecognised ws event message",
                Object.assign(Object.assign({}, logContext), {
                    eventName: msg.event,
                    msg: JSON.stringify(msg, null, 2),
                    wsKey,
                })
            );
        } catch (e) {
            this.logger.error(
                "Failed to parse ws event message",
                Object.assign(Object.assign({}, logContext), {
                    error: e,
                    event,
                    wsKey,
                })
            );
        }
    }
    onWsClose(event, wsKey) {
        this.logger.info(
            "Websocket connection closed",
            Object.assign(Object.assign({}, loggerCategory), { wsKey })
        );
        if (
            this.wsStore.getConnectionState(wsKey) !==
            util_1.WsConnectionStateEnum.CLOSING
        ) {
            this.reconnectWithDelay(wsKey, this.options.reconnectTimeout);
            this.emit("reconnect", { wsKey, event });
        } else {
            this.wsStore.setConnectionState(
                wsKey,
                util_1.WsConnectionStateEnum.INITIAL
            );
            this.emit("close", { wsKey, event });
        }
    }
}
exports.WebsocketClient = WebsocketClient;
//# sourceMappingURL=websocket-client.js.map
