const AsyncLock = require("async-lock");
const { scheduleLoopTask, sleep, fileExists } = require("./utils/run");
const { log } = require("./utils/log");
const OkxClient = require("./clients/okx");
const StatOrderService = require("./services/statOrder");

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
    market,
};
const exchangeClient = new OkxClient(options);

const tickerUpdate = async (event) => {
    console.log(event.data[0].ts, Date.now());
};
const main = async () => {
    exchangeClient.initWsEventHandler({
        tickers: tickerUpdate,
    });
    exchangeClient.wsFuturesBookTicker(["BTC-USDT-SWAP"]);
};
main();
