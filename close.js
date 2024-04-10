const { RestClient, WebsocketClient } = require("okx-api");
const { v4: uuidv4 } = require("uuid");
const {
    scheduleLoopTask,
    sleep,
    convertScientificToString,
} = require("./utils/run");
// 加载.env文件
const dotenv = require("dotenv");
dotenv.config();
const apiKeyArr = process.env.OKX_API_KEY.split(",");
const apiSecretArr = process.env.OKX_API_SECRET.split(",");
const apiPasswordArr = process.env.OKX_API_PASSWORD.split(",");
const keyIndex = process.env.KEY_INDEX;
client = new RestClient(
    {
        apiKey: apiKeyArr[keyIndex],
        apiSecret: apiSecretArr[keyIndex],
        apiPass: apiPasswordArr[keyIndex],
    },
    "prod"
);

async function getFuturesTickers() {
    try {
        let tickers = await client.getTickers("SWAP");
        if (tickers == null || tickers.length == 0) {
            return null;
        }
        let result = {};
        for (let ticker of tickers) {
            const stdTicker = _formatTickers([ticker]);
            result[stdTicker.symbol] = stdTicker;
        }
        return result;
    } catch (e) {
        console.error("getFuturesTickers", e);
    }
}

function _formatTickers(tickers) {
    if (tickers.length == 0) {
        return null;
    }
    const ticker = tickers[0];
    return {
        symbol: ticker.instId,
        bestBid: ticker.bidPx,
        bestAsk: ticker.askPx,
    };
}

const getPositions = async () => {
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

        return formatPositions(positions);
    } catch (e) {
        console.error("getPositions", e);
    }
};

const formatPositions = (positions) => {
    let stdPositions = [];
    for (let item of positions) {
        let notional =
            item.pos > 0
                ? parseFloat(item.notionalUsd)
                : -parseFloat(item.notionalUsd);
        let pos = {
            symbol: item.instId,
            unrealizedProfit: parseFloat(item.upl),
            positionAmt: parseFloat(item.pos),
            entryPrice: parseFloat(item.avgPx),
            notional: notional,
        };
        stdPositions.push(pos);
    }
    return stdPositions;
};

const getOpenOrders = async () => {
    let allOrders = [];
    let afterOrderId = "";
    try {
        while (true) {
            const pageOrders = await client.getOrderList({
                instType: "SWAP",
                after: afterOrderId,
                limit: 100, // 每页最多100条
            });

            // 如果没有订单了，退出循环
            if (pageOrders.length === 0) {
                break;
            }

            // 将这一页的订单添加到总订单列表中
            allOrders = allOrders.concat(pageOrders);

            // 获取最后一条订单的 orderId
            afterOrderId = pageOrders[pageOrders.length - 1].ordId;
        }
    } catch (error) {
        console.error("getFuturesOpenOrderList:", error);
    }

    if (allOrders == null || allOrders.length == 0) {
        return [];
    }

    return formatOrders(allOrders);
};

const formatOrders = (orders) => {
    let finalOrders = [];
    orders.forEach((o) => {
        let executionType = "";
        let state = o.state;
        if (o.amendResult !== "") {
            // 修改订单的时候，order status设置程'NEW'与币安统一。
            executionType = "AMENDMENT";
            state = "live";
        }
        let order = {
            symbol: o.instId,
            clientOrderId: o.clOrdId,
            side: o.side.toUpperCase(),
            price: parseFloat(o.px),
            lastFilledPrice: parseFloat(o.lastPx),
            orderStatus: formatOrderStatus(state),
            executionType: executionType, // 用这个来标识是否是修改订单
            originalPrice: parseFloat(o.px),
            originalQuantity: parseFloat(o.sz),
            orderTime: parseInt(o.uTime),
            filledQuantity: parseFloat(o.fillSz),
            filledNotional: o.fillNotionalUsd,
        };
        finalOrders.push(order);
    });
    return finalOrders;
};

const formatOrderStatus = (state) => {
    switch (state) {
        case "live":
            return "NEW";
        case "canceled":
            return "CANCELED";
        case "partially_filled":
            return "PARTIALLY_FILLED";
        case "filled":
            return "FILLED";
        default:
            return state;
    }
};

async function cancelAllFuturesOrders(symbol) {
    try {
        const allOpenOrders = await getOpenOrders();
        const allSymbolOrders = allOpenOrders.filter(
            (order) => order.symbol === symbol
        );
        if (allSymbolOrders.length == 0) {
            return;
        }

        const cancelCliendOrderIds = allSymbolOrders.map(
            (order) => order.clientOrderId
        );
        return await batchCancelFuturesOrdersByCids(
            symbol,
            cancelCliendOrderIds
        );
    } catch (e) {
        console.error("cancelAllFuturesOrders", symbol, e);
    }
}

async function batchCancelFuturesOrdersByCids(symbol, clientOrderIds) {
    try {
        if (clientOrderIds.length == 1) {
            await cancelFuturesOrder(symbol, clientOrderIds[0]);
        } else {
            // 取消通常要及时完成，这里先不做频率限制
            const batchSize = 10;
            while (clientOrderIds.length > 0) {
                const batchIds = clientOrderIds.splice(0, batchSize);
                const batchParams = batchIds.map((cid) => {
                    return { instId: symbol, clOrdId: cid };
                });
                await client.cancelMultipleOrders(batchParams);
            }
        }
    } catch (e) {
        console.error(
            "batchCancelFuturesOrdersByCids",
            symbol,
            clientOrderIds,
            e
        );
    }
}

async function cancelFuturesOrder(symbol, clientOrderId) {
    try {
        client.cancelOrder({
            instId: symbol,
            clOrdId: clientOrderId,
        });
    } catch (e) {
        if (e && e.code != 0 && e.data) {
            if (e.data.length > 0) {
                for (let result of e.data) {
                    // 0 成功
                    // 51400 撤单失败，订单已撤销
                    // 51410 撤单失败, 订单已处于撤单中
                    // 51503 订单不存在或已完成，导致改单失败
                    if (
                        result.sCode != 0 &&
                        result.sCode != 51400 &&
                        result.sCode != 51503 &&
                        result.sCode != 51410
                    ) {
                        // 51008 下单余额保证金不足
                        // 51502 修改订单余额保证金不足
                        // 51016 clientOrderId 重复
                        // 51006 买入价格超出限价范围
                        // 50022 强平冻结中
                        // 51000 参数错误
                        console.error(
                            "cancelFuturesOrder",
                            symbol,
                            clientOrderId,
                            e
                        );
                    }
                }
            }
        } else {
            console.error("cancelFuturesOrder", symbol, clientOrderId, e);
        }
    }
}

async function placeFuturesOrder(side, symbol, quantity, price, params) {
    price = convertScientificToString(price);
    try {
        side = side.toLowerCase();
        const posSide = side == "buy" ? "long" : "short";
        const order = {
            instId: symbol,
            ordType: "post_only", // 后续可以根据params中的数据读取
            side,
            // posSide,
            px: price,
            sz: quantity + "",
            tdMode: "cross",
            clOrdId: params.newClientOrderId,
        };
        await this.client.submitOrder(order);
        return {
            symbol: order.instId,
            status: "NEW",
            clientOrderId: order.clOrdId,
            side: order.side.toUpperCase(),
            origQty: order.sz,
        };
    } catch (e) {
        console.error(
            "placeFuturesOrder",
            side,
            symbol,
            quantity,
            price,
            params,
            e
        );
        if (e.data && e.data.length > 0) {
            const errorInfo = e.data[0];
            return {
                code: errorInfo.sCode,
                clientOrderId: errorInfo.clOrdId,
                msg: errorInfo.sMsg,
            };
        }
    }
}

const genClientOrderId = () => {
    return uuidv4().replace(/-/g, "");
};

const closePositions = async () => {
    scheduleLoopTask(async () => {
        // 获取tickers
        const tickerMap = await getFuturesTickers();

        // 获取position
        const positions = await getPositions();
        let i = 0;
        if (positions != null && positions.length > 0) {
            for (let position of positions) {
                // if (['BTC-USDT-SWAP', 'ETH-USDT-SWAP'].includes(position.symbol)) {
                // 	continue;
                // }

                if (position.positionAmt == 0) {
                    continue;
                }
                i++;
                console.log(
                    `postion ${position.symbol} ${position.positionAmt}`
                );
                const ticker = tickerMap[position.symbol];
                if (ticker == null) {
                    log(`${position.symbol}'s ticker is null`);
                    continue;
                }

                await cancelAllFuturesOrders(position.symbol);
                if (position.positionAmt > 0) {
                    await placeFuturesOrder(
                        "SELL",
                        position.symbol,
                        Math.abs(position.positionAmt),
                        ticker.bestAsk,
                        {
                            newClientOrderId: genClientOrderId(),
                        }
                    );
                } else if (position.positionAmt < 0) {
                    await placeFuturesOrder(
                        "BUY",
                        position.symbol,
                        Math.abs(position.positionAmt),
                        ticker.bestBid,
                        {
                            newClientOrderId: genClientOrderId(),
                        }
                    );
                }
                await sleep(500);
            }
        }
        console.log(`still ${i} positions need to be close`);
        await sleep(20 * 1000);
    });
};

const main = async () => {
    closePositions();
};
main();
