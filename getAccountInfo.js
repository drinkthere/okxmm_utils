const { RestClient, WebsocketClient } = require("okx-api");
const { v4: uuidv4 } = require("uuid");
const { scheduleLoopTask, sleep, fileExists } = require("./utils/run");

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

const getFuturesBalances = async () => {
    const result = await client.getBalance();
    if (result.length == 0) {
        return 0;
    }

    const ret = [];
    const details = result[0].details;
    if (details && details.length > 1) {
        for (let detail of details) {
            ret.push({
                asset: detail.ccy,
                balance: parseFloat(detail.eq),
                notional: parseFloat(detail.disEq),
            });
        }
    }
    return ret;
};

const getFundingAccountBalances = async () => {
    const result = await client.getBalances();
    if (result.length == 0) {
        return 0;
    }

    const ret = [];
    const details = result[0].details;
    if (details && details.length > 1) {
        for (let detail of details) {
            ret.push({
                asset: detail.ccy,
                balance: detail.eq,
            });
        }
    }
    return ret;
};

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

const main = async () => {
    try {
        const balances = await getFuturesBalances();
        console.log("Trading Account Balance:");
        if (balances && balances.length > 0) {
            for (let bal of balances) {
                if (bal.balance != 0) {
                    console.log(bal.asset, bal.balance);
                }
            }
        }
        console.log();

        console.log("Funding Account Balance:");
        const fBalances = await getFundingAccountBalances();
        if (fBalances && fBalances.length > 0) {
            for (let bal of fBalances) {
                if (bal.balance != 0) {
                    console.log(bal.asset, bal.balance);
                }
            }
        } else {
            console.log(`No balance`);
        }
        console.log();

        console.log("Current Postions:");
        const positions = await getPositions();
        if (positions && positions.length > 0) {
            for (let pos of positions) {
                console.log(pos.symbol, pos.positionAmt, pos.unrealizedProfit);
            }
            console.log("position length:", positions.length);
        } else {
            console.log("No position");
        }
        console.log();

        console.log("Open Orders:");
        const openOrders = await getOpenOrders();
        if (openOrders && openOrders.length > 0) {
            for (let order of openOrders) {
                console.log(
                    order.symbol,
                    order.clientOrderId,
                    order.side,
                    order.originalPrice,
                    order.originalQuantity
                );
            }
            console.log("orders length:", openOrders.length);
        } else {
            console.log("No orders");
        }
    } catch (e) {
        console.error(e);
    }
};
main();
