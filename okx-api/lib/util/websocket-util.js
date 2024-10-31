"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WS_EVENT_CODE_ENUM =
    exports.isWsPong =
    exports.getMaxTopicsPerSubscribeEvent =
    exports.getWsUrlForWsKey =
    exports.getWsKeyForMarket =
    exports.getWsKeyForTopicChannel =
    exports.PUBLIC_WS_KEYS =
    exports.PRIVATE_WS_KEYS =
    exports.WS_KEY_MAP =
    exports.WS_BASE_URL_MAP =
        void 0;
const typeGuards_1 = require("./typeGuards");
exports.WS_BASE_URL_MAP = {
    prod: {
        public: "wss://ws.okx.com:8443/ws/v5/public",
        private: "wss://ws.okx.com:8443/ws/v5/private",
    },
    aws: {
        public: "wss://wsaws.okx.com:8443/ws/v5/public",
        private: "wss://wsaws.okx.com:8443/ws/v5/private",
    },
    business: {
        public: "wss://ws.okx.com:8443/ws/v5/business",
        private: "wss://ws.okx.com:8443/ws/v5/business",
    },
    businessAws: {
        public: "wss://wsaws.okx.com:8443/ws/v5/business",
        private: "wss://wsaws.okx.com:8443/ws/v5/business",
    },
    businessDemo: {
        public: "wss://wspap.okx.com:8443/ws/v5/business?brokerId=9999",
        private: "wss://wspap.okx.com:8443/ws/v5/business?brokerId=9999",
    },
    demo: {
        public: "wss://wspap.okx.com:8443/ws/v5/public?brokerId=9999",
        private: "wss://wspap.okx.com:8443/ws/v5/private?brokerId=9999",
    },
    colo: {
        public: "wss://colows1.okx.com/ws/v5/public",
        private: "wss://colows1.okx.com/ws/v5/private",
    },
    colo2: {
        public: "wss://colows2.okx.com/ws/v5/public",
        private: "wss://colows2.okx.com/ws/v5/private",
    },
    colo3: {
        public: "wss://colows3.okx.com/ws/v5/public",
        private: "wss://colows3.okx.com/ws/v5/private",
    },
};
exports.WS_KEY_MAP = {
    prodPublic: "prodPublic",
    prodPrivate: "prodPrivate",
    coloPublic: "coloPublic",
    coloPrivate: "coloPrivate",
    colo2Public: "colo2Public",
    colo2Private: "colo2Private",
    colo3Public: "colo3Public",
    colo3Private: "colo3Private",
    awsPublic: "awsPublic",
    awsPrivate: "awsPrivate",
    demoPublic: "demoPublic",
    demoPrivate: "demoPrivate",
    businessPrivate: "businessPrivate",
    businessPublic: "businessPublic",
    businessAwsPrivate: "businessAwsPrivate",
    businessAwsPublic: "businessAwsPublic",
    businessDemoPublic: "businessDemoPublic",
    businessDemoPrivate: "businessDemoPrivate",
};
exports.PRIVATE_WS_KEYS = [
    exports.WS_KEY_MAP.prodPrivate,
    exports.WS_KEY_MAP.coloPrivate,
    exports.WS_KEY_MAP.colo2Private,
    exports.WS_KEY_MAP.colo3Private,
    exports.WS_KEY_MAP.awsPrivate,
    exports.WS_KEY_MAP.businessPrivate,
    exports.WS_KEY_MAP.businessAwsPrivate,
    exports.WS_KEY_MAP.demoPrivate,
    exports.WS_KEY_MAP.businessDemoPrivate,
];
exports.PUBLIC_WS_KEYS = [
    exports.WS_KEY_MAP.prodPublic,
    exports.WS_KEY_MAP.coloPublic,
    exports.WS_KEY_MAP.colo2Public,
    exports.WS_KEY_MAP.colo3Public,
    exports.WS_KEY_MAP.awsPublic,
    exports.WS_KEY_MAP.businessPublic,
    exports.WS_KEY_MAP.businessAwsPublic,
    exports.WS_KEY_MAP.demoPublic,
    exports.WS_KEY_MAP.businessDemoPublic,
];
/** Used to automatically determine if a sub request should be to the public or private ws (when there's two) */
const PRIVATE_CHANNELS = [
    "account",
    "positions",
    "balance_and_position",
    "orders",
    "orders-algo",
    "algo-advance",
    "liquidation-warning",
    "account-greeks",
    "grid-orders-spot",
    "grid-orders-contract",
    "grid-orders-moon",
    "grid-positions",
    "grid-sub-orders",
];
/**
 * The following channels only support the new business wss endpoint:
 * https://www.okx.com/help-center/changes-to-v5-api-websocket-subscription-parameter-and-url
 */
const BUSINESS_CHANNELS = [
    "orders-algo",
    "algo-advance",
    "deposit-info",
    "withdrawal-info",
    "grid-orders-spot",
    "grid-orders-contract",
    "grid-orders-moon",
    "grid-positions",
    "grid-sub-orders",
    "algo-recurring-buy",
    "candle1Y",
    "candle6M",
    "candle3M",
    "candle1M",
    "candle1W",
    "candle1D",
    "candle2D",
    "candle3D",
    "candle5D",
    "candle12H",
    "candle6H",
    "candle4H",
    "candle2H",
    "candle1H",
    "candle30m",
    "candle15m",
    "candle5m",
    "candle3m",
    "candle1m",
    "candle1Yutc",
    "candle3Mutc",
    "candle1Mutc",
    "candle1Wutc",
    "candle1Dutc",
    "candle2Dutc",
    "candle3Dutc",
    "candle5Dutc",
    "candle12Hutc",
    "candle6Hutc",
    "mark-price-candle1Y",
    "mark-price-candle6M",
    "mark-price-candle3M",
    "mark-price-candle1M",
    "mark-price-candle1W",
    "mark-price-candle1D",
    "mark-price-candle2D",
    "mark-price-candle3D",
    "mark-price-candle5D",
    "mark-price-candle12H",
    "mark-price-candle6H",
    "mark-price-candle4H",
    "mark-price-candle2H",
    "mark-price-candle1H",
    "mark-price-candle30m",
    "mark-price-candle15m",
    "mark-price-candle5m",
    "mark-price-candle3m",
    "mark-price-candle1m",
    "mark-price-candle1Yutc",
    "mark-price-candle3Mutc",
    "mark-price-candle1Mutc",
    "mark-price-candle1Wutc",
    "mark-price-candle1Dutc",
    "mark-price-candle2Dutc",
    "mark-price-candle3Dutc",
    "mark-price-candle5Dutc",
    "mark-price-candle12Hutc",
    "mark-price-candle6Hutc",
    "index-candle1Y",
    "index-candle6M",
    "index-candle3M",
    "index-candle1M",
    "index-candle1W",
    "index-candle1D",
    "index-candle2D",
    "index-candle3D",
    "index-candle5D",
    "index-candle12H",
    "index-candle6H",
    "index-candle4H index -candle2H",
    "index-candle1H",
    "index-candle30m",
    "index-candle15m",
    "index-candle5m",
    "index-candle3m",
    "index-candle1m",
    "index-candle1Yutc",
    "index-candle3Mutc",
    "index-candle1Mutc",
    "index-candle1Wutc",
    "index-candle1Dutc",
    "index-candle2Dutc",
    "index-candle3Dutc",
    "index-candle5Dutc",
    "index-candle12Hutc",
    "index-candle6Hutc",
];
/** Determine which WsKey (ws connection) to route an event to */
function getWsKeyForTopicChannel(market, channel, isPrivate) {
    const isPrivateTopic =
        isPrivate === true || PRIVATE_CHANNELS.includes(channel);
    const isBusinessChannel = BUSINESS_CHANNELS.includes(channel);
    return getWsKeyForMarket(market, isPrivateTopic, isBusinessChannel);
}
exports.getWsKeyForTopicChannel = getWsKeyForTopicChannel;
function getWsKeyForMarket(market, isPrivate, isBusinessChannel) {
    switch (market) {
        case "prod": {
            if (isBusinessChannel) {
                return isPrivate
                    ? exports.WS_KEY_MAP.businessPrivate
                    : exports.WS_KEY_MAP.businessPublic;
            }
            return isPrivate
                ? exports.WS_KEY_MAP.prodPrivate
                : exports.WS_KEY_MAP.prodPublic;
        }
        case "colo": {
            return isPrivate
                ? exports.WS_KEY_MAP.coloPrivate
                : exports.WS_KEY_MAP.coloPublic;
        }
        case "colo2": {
            return isPrivate
                ? exports.WS_KEY_MAP.colo2Private
                : exports.WS_KEY_MAP.colo2Public;
        }
        case "colo3": {
            return isPrivate
                ? exports.WS_KEY_MAP.colo3Private
                : exports.WS_KEY_MAP.colo3Public;
        }
        case "aws": {
            if (isBusinessChannel) {
                return isPrivate
                    ? exports.WS_KEY_MAP.businessAwsPrivate
                    : exports.WS_KEY_MAP.businessAwsPublic;
            }
            return isPrivate
                ? exports.WS_KEY_MAP.awsPrivate
                : exports.WS_KEY_MAP.awsPublic;
        }
        case "demo": {
            if (isBusinessChannel) {
                return isPrivate
                    ? exports.WS_KEY_MAP.businessDemoPrivate
                    : exports.WS_KEY_MAP.businessDemoPublic;
            }
            return isPrivate
                ? exports.WS_KEY_MAP.demoPrivate
                : exports.WS_KEY_MAP.demoPublic;
        }
        case "business": {
            return isPrivate
                ? exports.WS_KEY_MAP.businessPrivate
                : exports.WS_KEY_MAP.businessPublic;
        }
        case "businessAws": {
            return isPrivate
                ? exports.WS_KEY_MAP.businessAwsPrivate
                : exports.WS_KEY_MAP.businessAwsPublic;
        }
        case "businessDemo": {
            return isPrivate
                ? exports.WS_KEY_MAP.businessDemoPrivate
                : exports.WS_KEY_MAP.businessDemoPublic;
        }
        default: {
            throw (0, typeGuards_1.neverGuard)(
                market,
                `getWsKeyForTopic(): Unhandled market`
            );
        }
    }
}
exports.getWsKeyForMarket = getWsKeyForMarket;
/** Maps a WS key back to a WS URL */
function getWsUrlForWsKey(wsKey, wsClientOptions) {
    if (wsClientOptions.wsUrl) {
        return wsClientOptions.wsUrl;
    }
    switch (wsKey) {
        case "prodPublic":
            return exports.WS_BASE_URL_MAP.prod.public;
        case "prodPrivate":
            return exports.WS_BASE_URL_MAP.prod.private;
        case "coloPublic":
            return exports.WS_BASE_URL_MAP.colo.public;
        case "coloPrivate":
            return exports.WS_BASE_URL_MAP.colo.private;
        case "colo2Public":
            return exports.WS_BASE_URL_MAP.colo2.public;
        case "colo2Private":
            return exports.WS_BASE_URL_MAP.colo2.private;
        case "colo3Public":
            return exports.WS_BASE_URL_MAP.colo3.public;
        case "colo3Private":
            return exports.WS_BASE_URL_MAP.colo3.private;
        case "awsPublic":
            return exports.WS_BASE_URL_MAP.aws.public;
        case "awsPrivate":
            return exports.WS_BASE_URL_MAP.aws.private;
        case "demoPublic":
            return exports.WS_BASE_URL_MAP.demo.public;
        case "demoPrivate":
            return exports.WS_BASE_URL_MAP.demo.private;
        case "businessPublic":
            return exports.WS_BASE_URL_MAP.business.public;
        case "businessPrivate":
            return exports.WS_BASE_URL_MAP.business.private;
        case "businessAwsPublic":
            return exports.WS_BASE_URL_MAP.businessAws.public;
        case "businessAwsPrivate":
            return exports.WS_BASE_URL_MAP.businessAws.private;
        case "businessDemoPublic":
            return exports.WS_BASE_URL_MAP.businessDemo.public;
        case "businessDemoPrivate":
            return exports.WS_BASE_URL_MAP.businessDemo.private;
        default: {
            const errorMessage = "getWsUrl(): Unhandled wsKey: ";
            this.logger.error(errorMessage, {
                category: "okx-ws",
                wsKey,
            });
            throw (0, typeGuards_1.neverGuard)(wsKey, errorMessage);
        }
    }
}
exports.getWsUrlForWsKey = getWsUrlForWsKey;
function getMaxTopicsPerSubscribeEvent(market) {
    switch (market) {
        case "prod":
        case "colo":
        case "colo2":
        case "colo3":
        case "aws":
        case "demo":
        case "business":
        case "businessDemo":
        case "businessAws": {
            return null;
        }
        default: {
            throw (0, typeGuards_1.neverGuard)(
                market,
                `getWsKeyForTopic(): Unhandled market`
            );
        }
    }
}
exports.getMaxTopicsPerSubscribeEvent = getMaxTopicsPerSubscribeEvent;
function isWsPong(event) {
    return (
        typeof event === "object" &&
        !!event &&
        "data" in event &&
        typeof event["data"] === "string" &&
        event["data"] === "pong"
    );
}
exports.isWsPong = isWsPong;
exports.WS_EVENT_CODE_ENUM = {
    OK: "0",
    LOGIN_FAILED: "60009",
    LOGIN_PARTIALLY_FAILED: "60022",
};
//# sourceMappingURL=websocket-util.js.map
