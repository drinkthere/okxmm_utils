const AsyncLock = require("async-lock");
const { scheduleLoopTask, sleep, fileExists } = require("./utils/run");
const { v4: uuidv4 } = require("uuid");
const { log } = require("./utils/log");
const OkxClient = require("./clients/okx");
const StatOrderService = require("./services/statOrder");
const symbol = "MATIC-USDT-SWAP";
const cfgFile = `./configs/config.json`;
if (!fileExists(cfgFile)) {
    log(`config file ${cfgFile} does not exits`);
    process.exit();
}
const configs = require(cfgFile);

let { account, market } = require("minimist")(process.argv.slice(2));
if (account == null) {
    log("node testTickerSpeed.js --account=xxx --market=xxx");
    process.exit();
}
market = market == null ? "prod" : market;
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
    market: configs.market,
    localAddress: configs.okxLocalAddress[account],
};
const exchangeClient = new OkxClient(options);

const orderUpdateHandler = async (orders) => {
    for (let order of orders) {
        // 使用clientOrderId作为锁的key，避免并发引起的更新错误
        const clientOrderId = order.clientOrderId;
        if (["NEW"].includes(order.orderStatus) && order.symbol == symbol) {
            console.log(
                `${clientOrderId} NEW ${order.orderTime} ${Date.now()}`
            );
        } else if (
            ["CANCELED"].includes(order.orderStatus) &&
            order.symbol == symbol
        ) {
            console.log(
                `${clientOrderId} CANCELED ${order.orderTime} ${Date.now()}`
            );
        }
    }
};

const genClientOrderId = () => {
    return uuidv4().replace(/-/g, "");
};

const main = async () => {
    exchangeClient.initWsEventHandler({
        orders: orderUpdateHandler,
    });
    exchangeClient.wsFuturesOrders();
    await sleep(2000);
    scheduleLoopTask(async () => {
        const clientOrderId = genClientOrderId();
        const start = Date.now();
        // 下单
        console.log(`${clientOrderId} NEWSUBMIT ${Date.now()}`);
        exchangeClient.wsPlaceFuturesOrder("BUY", symbol, 1, 0.64, {
            newClientOrderId: clientOrderId,
        });
        console.log(`${clientOrderId} NEWSUBMITTED ${Date.now()}`);
        // console.log(`NEW ${Date.now()-start}`)
        await sleep(1000);
        // 撤单
        console.log(`${clientOrderId} CANCELSUBMIT ${Date.now()}`);
        await exchangeClient.wsCancelFuturesOrder(symbol, clientOrderId);
        console.log(`${clientOrderId} CANCELSUBMITTED ${Date.now()}`);
        await sleep(100 * 1000);
    });
};
main();
