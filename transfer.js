const OkxClient = require("./clients/okx");
const { v4: uuidv4 } = require("uuid");
const {
    scheduleLoopTask,
    sleep,
    convertScientificToString,
    fileExists,
} = require("./utils/run");
const cfgFile = `./configs/config.json`;
if (!fileExists(cfgFile)) {
    log(`config file ${cfgFile} does not exits`);
    process.exit();
}
const configs = require(cfgFile);

const { account } = require("minimist")(process.argv.slice(2));
if (account == null) {
    log("node close.js --account=xxx");
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

const genClientOrderId = () => {
    return uuidv4().replace(/-/g, "");
};

const main = async () => {
    const result = await exchangeClient.trasferAsset(
        "Funding",
        "Trading",
        "USDT",
        "566.4065851610826"
    );
    console.log(result);
};
main();
