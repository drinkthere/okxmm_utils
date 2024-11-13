const path = require("path");
const {
    getDecimals,
    deleteFilesInDirectory,
    writeStringToFile,
    fileExists,
} = require("./utils/run");

const cfgFile = `./configs/config.json`;
if (!fileExists(cfgFile)) {
    log(`config file ${cfgFile} does not exits`);
    process.exit();
}
const configs = require(cfgFile);

const OkxClient = require("./clients/okx");
const BinanceClient = require("./clients/binance");
const keyIndex = 0;
const orderAmount = 100;
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
};
const okxClient = new OkxClient(options);
let okxSwapConfigMap = {};
let okxSwapTickersMap = {};
const directory = "./mm-config";
let dcs006Config = require("../okxmm/config/config-dcs006.json");
let dcs008Config = require("../okxmm/config/config-dcs008.json");
// 定义参数=========================================================
const uPerOrder = 500; // 一单200U
const firstOrderMargin = 0.0005; // 第一单距离最大（小forBid）价格的距离
const firstOrderRangePercent = 0.0005;
const gapSizePercent = 0.0005;
const forgivePercent = 0.9992;
const tickerShift = 0.000025;
const maxOrderNum = 3;
const farOrderNum = 5; // 比maxOrderNum大一点就可以，避免浪费api
const volatilityE = 0.75;
const volatilityD = 4;
const volatilityG = 1000;
const minimumTickerShiftMulti = 2; // 这里用的是倍数，不是原始配置文件中的绝对值，因为contractNum是计算出来的，所以用倍数比较好，相当于 2 * contractNumber
const maximumTickerShiftMulti = 8; // 这里用的是倍数，不是原始配置文件中的绝对值，因为contractNum是计算出来的，所以用倍数比较好，相当于 4 * contractNumber
const positionReduceFactorMulti = 2; // 这里用的是倍数，不是原始配置文件中的绝对值，因为contractNum是计算出来的，所以用倍数比较好，相当于 2 * contractNumber
const positionOffset = 0;
const maxContractNumMulti = 50; // 这里用的是倍数，不是原始配置文件中的绝对值，因为contractNum是计算出来的，所以用倍数比较好，相当于 100 * contractNumber
const breakEvenX = 0.03;

const genOkxSwapTickersMap = async () => {
    okxSwapTickersMap = await okxClient.getFuturesTickers();
};

const genOkxSwapMap = async () => {
    const insts = await okxClient.getInstruments("SWAP");
    for (let inst of insts) {
        var asset;
        asset = inst.ctValCcy;
        okxSwapConfigMap[asset] = inst;
    }
};

function calculateContractNum(instInfo, tickerInfo) {
    const price = parseFloat(tickerInfo.bestAsk); // ask价格高一些，用高的价格计算
    const contractValue = parseFloat(instInfo.ctVal); // 一张合约对应币的数量
    const contractPrice = price * contractValue; // 一张合约的价钱

    // 计算下单张数
    let contractNum = uPerOrder / contractPrice;

    // 确保下单张数为最小变动的整数倍
    const minSize = parseFloat(instInfo.minSz);
    contractNum = Math.round((contractNum / minSize) * minSize);

    // 确保下单张数不低于最小合约下单张数
    contractNum = Math.max(contractNum, minSize);

    return contractNum;
}

const main = async () => {
    try {
        deleteFilesInDirectory(directory);
        await genOkxSwapTickersMap();
        await genOkxSwapMap();
        genConfigFile("config-dcs006.json", dcs006Config);
        genConfigFile("config-dcs008.json", dcs008Config);
    } catch (e) {
        console.error(e);
    }
};
const genConfigFile = (filename, configs) => {
    const okxSwapInsts = configs["InstIDs"];
    instConfigs = {};
    for (let inst of okxSwapInsts) {
        const asset = inst.replace("-USDT-SWAP", "");
        const instInfo = okxSwapConfigMap[asset];
        const tickerInfo = okxSwapTickersMap[inst];
        const contractNum = calculateContractNum(instInfo, tickerInfo);
        instConfigs[inst] = {
            ContractNum: contractNum,
            VolPerCont: parseFloat(instInfo.ctVal),
            BaseAsset: asset,
            Leverage: 10,
            EffectiveNum: parseFloat(instInfo.minSz),
            Precision: [
                getDecimals(instInfo.tickSz),
                getDecimals(instInfo.lotSz),
            ],
            FirstOrderMargin: firstOrderMargin,
            FirstOrderRangePercent: firstOrderRangePercent,
            GapSizePercent: gapSizePercent,
            ForgivePercent: forgivePercent,
            TickerShift: tickerShift,
            MaxOrderNum: maxOrderNum,
            FarOrderNum: farOrderNum,
            VolatilityE: volatilityE,
            VolatilityD: volatilityD,
            VolatilityG: volatilityG,
            MinimumTickerShift: minimumTickerShiftMulti * contractNum,
            MaximumTickerShift: maximumTickerShiftMulti * contractNum,
            PositionReduceFactor: positionReduceFactorMulti * contractNum,
            PositionOffset: positionOffset,
            MaxContractNum: maxContractNumMulti * contractNum,
            BreakEvenX: breakEvenX,
        };
    }
    configs["InstIDConfigs"] = instConfigs;

    let formattedJSON = JSON.stringify(configs, null, 4);
    const filePath = path.join(directory, filename);
    writeStringToFile(filePath, formattedJSON);
    console.log(`config file ${filename} generated in ${directory}`);
};
main();
