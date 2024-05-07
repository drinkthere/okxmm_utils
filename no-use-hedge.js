const AsyncLock = require("async-lock");
const { v4: uuidv4 } = require("uuid");
const { scheduleLoopTask, sleep, fileExists } = require("./utils/run");
const { log } = require("./utils/log");
const { RestClient, WebsocketClient, DefaultLogger } = require("./okx-api");

// 加载.env文件
const dotenv = require("dotenv");
dotenv.config();
const apiKeyArr = process.env.OKX_API_KEY.split(",");
const apiSecretArr = process.env.OKX_API_SECRET.split(",");
const apiPasswordArr = process.env.OKX_API_PASSWORD.split(",");
const hedgeApiKey = process.env.HEDGE_API_KEY;
const hedgeApiSecret = process.env.HEDGE_API_SECRET;
const hedgeApiPassword = process.env.HEDGE_API_PASSWORD;

const cfgFile = `./configs/config.json`;
if (!fileExists(cfgFile)) {
    log(`config file ${cfgFile} does not exits`);
    process.exit();
}
const configs = require(cfgFile);

// 初始化同步锁
const lock = new AsyncLock();

let accountIndex = ["mm1", "mm2", "mm3"];
let wsClientMap = {};
let clientMap = {};
let clientPositionMap = {};
let positionMap = {};
let hedgeOrderListMap = {};
let canOrder = true;

const hedgeParamMap = configs["hedgeParams"];
let symbols = Object.keys(hedgeParamMap);

const logger = {
    silly: (...params) => {},
    debug: (...params) => {},
    notice: (...params) => {},
    info: (...params) => {},
    warning: (...params) => {},
    error: (...params) => {},

    // silly: (...params) => console.log('silly', ...params),
};

const init = async () => {
    // 参数校验
    if (
        apiKeyArr.length != apiSecretArr.length ||
        apiKeyArr.length != apiPasswordArr.length
    ) {
        console.error(
            `[init ERROR] The length of api key, secret and password are not matched, key=${apiKeyArr.length}, secret=${apiSecretArr.length}, pasword=${apiPasswordArr.length}`
        );
        process.exit();
    }
    console.log("[init] params checking passed");

    // 初始化做市商账户的position和client
    for (let i = 0; i < apiKeyArr.length; i++) {
        (async (index) => {
            const clientId = accountIndex[i];
            const client = new RestClient(
                {
                    apiKey: apiKeyArr[index],
                    apiSecret: apiSecretArr[index],
                    apiPass: apiPasswordArr[index],
                },
                "prod"
            );
            const wsClient = new WebsocketClient(
                {
                    accounts: [
                        {
                            apiKey: apiKeyArr[index],
                            apiSecret: apiSecretArr[index],
                            apiPass: apiPasswordArr[index],
                        },
                    ],
                },
                logger
            );
            clientMap[clientId] = client;
            wsClientMap[clientId] = wsClient;
            clientPositionMap[clientId] = initPosition();
        })(i);
    }

    // 初始化对冲账户的position和client
    const clientId = "hedgeClient";
    const hedgeClient = new RestClient(
        {
            apiKey: hedgeApiKey,
            apiSecret: hedgeApiSecret,
            apiPass: hedgeApiPassword,
        },
        "prod"
    );
    const hedgeWsClient = new WebsocketClient(
        {
            accounts: [
                {
                    apiKey: hedgeApiKey,
                    apiSecret: hedgeApiSecret,
                    apiPass: hedgeApiPassword,
                },
            ],
        },
        logger
    );
    clientPositionMap[clientId] = initPosition();
    clientMap[clientId] = hedgeClient;
    wsClientMap[clientId] = hedgeWsClient;

    console.log("[init] client and postion initialized");
    await restUpdatePosition();
    printPositions("init");
};

const restUpdatePosition = async () => {
    for (let clientId of Object.keys(clientMap)) {
        const client = clientMap[clientId];
        // 更新当前的position
        let positions = await getPositions(client);
        updatePosition(clientId, positions);
    }
};

const printPositions = (method, clientId = "") => {
    console.log(`${clientId} triggered`);
    console.log(`[${method}] client positions:`);
    for (let clientId of Object.keys(clientPositionMap)) {
        for (let symbol of Object.keys(clientPositionMap[clientId])) {
            const pos = clientPositionMap[clientId][symbol];
            console.log(`${clientId} ${symbol} ${pos.positionAmt}`);
        }
    }
    console.log(`[${method}] total positions:`);
    for (let symbol of Object.keys(positionMap)) {
        const pos = positionMap[symbol];
        console.log(`${symbol} ${pos}`);
    }
};

const initPosition = () => {
    const pm = {};
    for (let symbol of symbols) {
        pm[symbol] = {
            symbol: symbol,
            unrealizedProfit: 0,
            positionAmt: 0,
            bePrice: 0,
            notional: 0,
        };
    }
    return pm;
};

const getPositions = async (client) => {
    try {
        let positions = await client.getPositions();
        if (positions == null || positions.length == 0) {
            return null;
        }

        // 过滤出永续合约的positions
        positions = positions.filter((pos) => pos.instType == "SWAP");
        if (positions == null || positions.length == 0) {
            return null;
        }

        return _formatPositions(positions);
    } catch (e) {
        console.error("[getPositions ERROR] ", client, e);
        process.exit();
    }
};

const registerEventHandler = () => {
    for (let clientId of Object.keys(wsClientMap)) {
        const wsClient = wsClientMap[clientId];
        wsClient.on("update", (event) => {
            if (event.arg.channel == "orders") {
                const stdOrders = _formatOrders(event.data);
                updateOrder(clientId, stdOrders);
            } else if (event.arg.channel == "positions") {
                const stdPositions = _formatPositions(event.data);
                updatePosition(clientId, stdPositions);
            }
        });
    }
    console.log(
        "[registerEventHandler] positions and orders event handler registered"
    );
};

const startListeningPositionUpdate = () => {
    for (let clientId of Object.keys(wsClientMap)) {
        const wsClient = wsClientMap[clientId];
        wsClient.subscribe([
            {
                channel: "positions",
                instType: "SWAP",
                extraParams: '{"updateInterval": "5000"}',
            },
        ]);
    }
    console.log(
        "[startListeningPositionUpdate] subscribed position update event"
    );
};

const _formatPositions = (positions) => {
    let stdPositions = [];
    for (let item of positions) {
        let pos = {
            symbol: item.instId,
            positionAmt: parseFloat(item.pos),
        };
        stdPositions.push(pos);
    }
    return stdPositions;
};

const updatePosition = async (clientId, positions) => {
    if (positions && positions.length > 0) {
        pm = clientPositionMap[clientId];
        for (let position of positions) {
            const symbol = position.symbol;
            if (!symbols.includes(symbol)) {
                continue;
            }

            await lock.acquire(symbol, async () => {
                pm[symbol] = position;

                let newPosition = 0;
                for (let clientId of Object.keys(clientMap)) {
                    newPosition +=
                        clientPositionMap[clientId][symbol].positionAmt;
                }
                positionMap[symbol] = newPosition;

                const hedgeParam = hedgeParamMap[symbol];
                if (!hedgeParam) {
                    console.error(
                        `[checkToCancelOrders ERROR] ${symbol}'s hedgeParam does not exist`
                    );
                    return false;
                }

                if (
                    newPosition >= -hedgeParam.threshold &&
                    newPosition <= hedgeParam.threshold
                ) {
                    // 如果从range范围外进入到可以接受的持仓风险范围内，就把现有的对冲单全部取消掉
                    console.log(
                        `[updateOrder] ${symbol} position=${newPosition} in [${-hedgeParam.threshold}, ${
                            hedgeParam.threshold
                        }] range, cancel current hedge orders`
                    );
                    cancelAllOpenHedgeOrders(symbol);
                } else {
                    console.log(
                        `[updateOrder] ${symbol} position=${newPosition} not in [${-hedgeParam.threshold}, ${
                            hedgeParam.threshold
                        }] range, place hedge order`
                    );
                    return "hedge";
                }
            });
        }
    }
    printPositions("updatePosition", clientId);
};

const startListeningOrderUpdate = () => {
    for (let clientId of Object.keys(wsClientMap)) {
        const wsClient = wsClientMap[clientId];
        wsClient.subscribe([
            {
                channel: "orders",
                instType: "SWAP",
            },
        ]);
    }
    console.log("[startListeningOrderUpdate] subscribed order update event");
};

const _formatOrders = (orders) => {
    let finalOrders = [];
    orders.forEach((o) => {
        let order = {
            symbol: o.instId,
            clientOrderId: o.clOrdId,
            side: o.side.toLowerCase(),
            orderStatus: o.state,
            filledPrice: parseFloat(o.fillPx),
            filledQuantity: parseFloat(o.fillSz),
        };
        finalOrders.push(order);
    });
    return finalOrders;
};

const updateOrder = async (clientId, orders) => {
    if (clientId == "hedgeClient") {
        // 更新订单列表，方便后续取消时，不用再
        for (let order of orders) {
            if (!symbols.includes(order.symbol)) {
                continue;
            }
            console.log(
                `[updateOrder] ${clientId} ${order.symbol} ${order.clientOrderId} ${order.orderStatus} triggered`
            );
            if (order.orderStatus == "live") {
                // 添加到订单列表中
                addToOrderList(order.symbol, order.clientOrderId);
            } else if (
                order.orderStatus == "filled" ||
                order.orderStatus == "canceled"
            ) {
                // 从订单列表中删除
                removeOrderFromList(order.symbol, order.clientOrderId);
            }
        }
    } else {
        for (let order of orders) {
            if (!symbols.includes(order.symbol)) {
                continue;
            }
            if (order.orderStatus == "filled") {
                console.log(
                    `[updateOrder] ${clientId} ${order.symbol} triggered`
                );
                // 这里直接对冲，取消订单的操作在position更新时操作
                placeHedgeOrder(order);
            } else if (
                order.orderStatus != "live" &&
                order.orderStatus != "canceled"
            ) {
                console.log(order);
            }
        }
    }
};

const addToOrderList = async (symbol, clientOrderId) => {
    console.log(
        `[addToOrderList] add ${clientOrderId} to ${symbol} order list`
    );
    if (!hedgeOrderListMap.hasOwnProperty(symbol)) {
        const orderList = [];
        orderList.push(clientOrderId);
        hedgeOrderListMap[symbol] = orderList;
        return;
    }

    const orderList = hedgeOrderListMap[symbol];
    if (!orderList.includes(clientOrderId)) {
        orderList.push(clientOrderId);
        hedgeOrderListMap[symbol] = orderList;
    }
};

const removeOrderFromList = (symbol, clientOrderId) => {
    if (!hedgeOrderListMap.hasOwnProperty(symbol)) {
        return;
    }

    const orderList = hedgeOrderListMap[symbol];
    if (orderList.length == 0) {
        return;
    }

    const index = orderList.indexOf(clientOrderId);
    if (index !== -1) {
        orderList.splice(index, 1);
        hedgeOrderListMap[symbol] = orderList;
    }
};

const cancelAllOpenHedgeOrders = async (symbol) => {
    const client = clientMap["hedgeClient"];
    const clientOrderIds = hedgeOrderListMap[symbol];
    if (!clientOrderIds || clientOrderIds.length == 0) {
        console.log(`[cancelAllOpenHedgeOrders] ${symbol} no orders to cancel`);
        return;
    }
    console.log("[cancelAllOpenHedgeOrders] Cancel", symbol, clientOrderIds);
    if (clientOrderIds.length == 1) {
        try {
            await client.cancelOrder({
                instId: symbol,
                clOrdId: clientOrderIds[0],
            });
        } catch (e) {
            console.error("[cancelAllOpenHedgeOrders Exception]", e);
        }
    } else {
        // 取消通常要及时完成，这里先不做频率限制
        const batchSize = 10;
        while (clientOrderIds.length > 0) {
            const batchIds = clientOrderIds.splice(0, batchSize);
            const batchParams = batchIds.map((cid) => {
                return { instId: symbol, clOrdId: cid };
            });
            try {
                await client.cancelMultipleOrders(batchParams);
            } catch (e) {
                console.error("[cancelAllOpenHedgeOrders Exception]", e);
            }
        }
    }
};

const placeHedgeOrder = async (filledOrder) => {
    if (!canOrder) {
        console.log(`process is exiting, stop placing orders`);
        return;
    }
    const client = clientMap["hedgeClient"];

    const symbol = filledOrder.symbol;
    const quantity = filledOrder.filledQuantity;
    const hedgeParam = hedgeParamMap[symbol];
    let side = "buy";
    let price = filledOrder.filledPrice;
    if (filledOrder.side == "buy") {
        // 挂sell单对冲
        side = "sell";
        price = price * (1 + hedgeParam.gapPercent);
    } else {
        // 挂buy单对冲
        price = price * (1 - hedgeParam.gapPercent);
    }

    const cid = uuidv4().replace(/-/g, "");
    // 提前添加到
    addToOrderList(symbol, cid);
    try {
        price = formatPrice(price, hedgeParam["decimals"]);
        const order = {
            instId: symbol,
            ordType: "post_only", // 后续可以根据params中的数据读取
            side,
            px: price,
            sz: quantity + "",
            tdMode: "cross",
            clOrdId: cid,
        };
        await client.submitOrder(order);
        console.log(
            `[placeHedgeOrder SUCC] ${symbol}@${price} ${side} ${quantity} ${cid}`
        );
    } catch (e) {
        console.error(
            `[placeHedgeOrder ERROR] ${symbol}@${price} ${side} ${quantity} ${cid}`,
            e
        );
    }
};

const formatPrice = (rawPrice, decimalPlaces) => {
    if (isNaN(rawPrice) || isNaN(decimalPlaces) || decimalPlaces < 0) {
        log(`Invalid input: price=${rawPrice}, decimal=${decimalPlaces}`);
    }

    return parseFloat(rawPrice).toFixed(decimalPlaces);
};

// const schedulingSyncPosition = async() => {
//     scheduleLoopTask(async () => {
//         console.log('scheduling update position')
//         await restUpdatePosition(false)
//         await sleep(60 * 1000);
// 	});
// }

process.env.TZ = "Asia/Hong_Kong";
process.on("SIGINT", async () => {
    canOrder = false;
    log("stop and exit");
    for (let symbol of symbols) {
        await cancelAllOpenHedgeOrders(symbol);
    }
    await sleep(5000);
    process.exit();
});

const main = async () => {
    await init();
    registerEventHandler();
    startListeningOrderUpdate();
    startListeningPositionUpdate();
};
main();
