const OkxClient = require("./clients/okx");
const { sleep, fileExists } = require("./utils/run");
const cfgFile = `./configs/config.json`;
if (!fileExists(cfgFile)) {
    log(`config file ${cfgFile} does not exits`);
    process.exit();
}
const configs = require(cfgFile);

const { account } = require("minimist")(process.argv.slice(2));
if (account == null) {
    log("node getAccount.js --account=xxx");
    process.exit();
}

const keyIndex = configs.keyIndexMap[account];
// 加载.env文件
const dotenv = require("dotenv");
dotenv.config();
const apiKeyArr = process.env.OKX_STAT_API_KEY.split(",");
const apiSecretArr = process.env.OKX_STAT_API_SECRET.split(",");
const apiPasswordArr = process.env.OKX_STAT_API_PASSWORD.split(",");

let options = {
    API_KEY: apiKeyArr[keyIndex],
    API_SECRET: apiSecretArr[keyIndex],
    API_PASSWORD: apiPasswordArr[keyIndex],
    market: configs.market[account],
    localAddress: configs.okxLocalAddress[account],
};
const exchangeClient = new OkxClient(options);

// const formatOrders = (orders) => {
//     let finalOrders = [];
//     orders.forEach((o) => {
//         let executionType = "";
//         let state = o.state;
//         if (o.amendResult !== "") {
//             // 修改订单的时候，order status设置程'NEW'与币安统一。
//             executionType = "AMENDMENT";
//             state = "live";
//         }
//         let order = {
//             symbol: o.instId,
//             clientOrderId: o.clOrdId,
//             side: o.side.toUpperCase(),
//             price: parseFloat(o.px),
//             lastFilledPrice: parseFloat(o.lastPx),
//             orderStatus: formatOrderStatus(state),
//             executionType: executionType, // 用这个来标识是否是修改订单
//             originalPrice: parseFloat(o.px),
//             originalQuantity: parseFloat(o.sz),
//             orderTime: parseInt(o.uTime),
//             filledQuantity: parseFloat(o.fillSz),
//             filledNotional: o.fillNotionalUsd,
//         };
//         finalOrders.push(order);
//     });
//     return finalOrders;
// };

const main = async () => {
    try {
        const balances = await exchangeClient.getFuturesBalances();
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
        const fBalances = await exchangeClient.getFundingAccountBalances();
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
        const positions = await exchangeClient.getPositions();
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
        const openOrders = await exchangeClient.getFuturesOpenOrderList();
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

        const feeRate = await exchangeClient.getFeeRates("SWAP");
        console.log(`Fee Rate: ${feeRate[0]["makerU"]}`);
    } catch (e) {
        console.error(e);
    }
};
main();
