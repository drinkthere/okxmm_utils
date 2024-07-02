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

function fillTime(timestamp) {
    // 创建一个新的 Date 对象，传入时间戳
    const date = new Date(timestamp);

    // 获取年份
    const year = date.getFullYear();

    // 获取月份（注意：月份是从0开始的，所以需要加1）
    const month = String(date.getMonth() + 1).padStart(2, "0");

    // 获取日期
    const day = String(date.getDate()).padStart(2, "0");

    // 获取小时
    const hours = String(date.getHours()).padStart(2, "0");

    // 获取分钟
    const minutes = String(date.getMinutes()).padStart(2, "0");

    // 获取秒钟
    const seconds = String(date.getSeconds()).padStart(2, "0");

    // 获取毫秒
    const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

    // 拼接成需要的格式
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}
const main = async () => {
    try {
        console.log("History Orders");
        const openOrders = await exchangeClient.getFuturesFilledOrders(
            "ETH-USDT-SWAP",
            1717676300000,
            1717676420000
        );
        if (openOrders && openOrders.length > 0) {
            for (let order of openOrders) {
                const dt = fillTime(parseInt(order.fillTime, 10));
                console.log(
                    dt,
                    order.instId,
                    order.clOrdId,
                    order.side,
                    order.fillSz,
                    order.fillPx
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
