const OkxClient = require("./clients/okx");
const { sleep, fileExists } = require("./utils/run");
const { log } = require("./utils/log");
const cfgFile = `./configs/config.json`;
if (!fileExists(cfgFile)) {
    log(`config file ${cfgFile} does not exits`);
    process.exit();
}
const configs = require(cfgFile);

const { account } = require("minimist")(process.argv.slice(2));
if (account == null) {
    log("node getAccountInfo.js --account=xxx");
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

const main = async () => {
    try {
        spotInsts = await exchangeClient.getInstruments("SPOT");
        spotInstsTickMap = spotInsts.reduce((map, item) => {
            map[item.instID] = {
                tickSz: parseFloat(item.tickSz),
                lotSz: parseFloat(item.lotSz),
                minSz: parseFloat(item.minSz),
            };
            return map;
        }, {});
        for (let instID of Object.keys(spotInstsTickMap)) {
            const mp = spotInstsTickMap[instID];
            console.log(instID, mp.tickSz, mp.minSz);
        }
        console.log();
        console.log();
        swapInsts = await exchangeClient.getInstruments("SWAP");
        swapInstsTickMap = swapInsts.reduce((map, item) => {
            map[item.instID] = {
                tickSz: parseFloat(item.tickSz),
                lotSz: parseFloat(item.lotSz),
                minSz: parseFloat(item.minSz),
            };
            return map;
        }, {});
        for (let instID of Object.keys(swapInstsTickMap)) {
            const mp = swapInstsTickMap[instID];
            console.log(instID, mp.tickSz, mp.minSz);
        }
    } catch (e) {
        console.error(e);
    }
};
main();
