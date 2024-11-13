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
const binanceClient = new BinanceClient({
    APIKEY: process.env.BINANCE_API_KEY,
    APISECRET: process.env.BINANCE_API_SECRET,
});
let okxFuturesConfigMap = {};
let bnFuturesAssetMap = {};

let validInstIDs = [];

const getOkxAssetsSet = async (instType) => {
    const insts = await okxClient.getInstruments(instType);
    let assetsSet = new Set();
    for (let inst of insts) {
        var asset;
        if (instType == "SWAP") {
            asset = inst.ctValCcy;
            okxFuturesConfigMap[inst.instID] = inst;
        } else {
            asset = inst.baseCcy;
        }
        assetsSet.add(asset);
    }
    return assetsSet;
};

const getBinanceAssetsSet = async (instType) => {
    var result;
    let assetSet = new Set();
    if (instType == "FUTURES") {
        // 获取binance支持的futures
        result = await binanceClient.futuresInstruments();
    } else if (instType == "SPOT") {
        result = await binanceClient.spotInstruments();
    }

    for (let item of result) {
        assetSet.add(item.baseAsset);
    }
    return assetSet;
};

const formatBinanceFuturesAssets = (bnFuturesAssets) => {
    let assetSet = new Set();
    for (let asset of bnFuturesAssets) {
        const formattedAsset = asset.replace("1000", "");
        bnFuturesAssetMap[formattedAsset] = asset;
        assetSet.add(formattedAsset);
    }
    return assetSet;
};

function calculateOrderSize(
    price,
    decimals,
    minSize,
    contractValue,
    contractTicker
) {
    // 格式化价格，保留小数位数
    const formattedPrice = parseFloat(price.toFixed(decimals));

    // 计算下单张数
    let targetOrderSize = orderAmount / (formattedPrice * contractValue);

    // 确保下单张数为最小变动的整数倍
    targetOrderSize =
        Math.round(targetOrderSize / contractTicker) * contractTicker;

    // 确保下单张数不低于最小合约下单张数
    targetOrderSize = Math.max(targetOrderSize, minSize);

    return targetOrderSize;
}

const main = async () => {
    try {
        // 获取okx 支持的futures
        const okxSwapAssets = await getOkxAssetsSet("SWAP");

        // 获取binance支持的futures
        let bnFuturesAssets = await getBinanceAssetsSet("FUTURES");
        bnFuturesAssets = formatBinanceFuturesAssets(bnFuturesAssets);

        const okxSwapInstrument = [];
        const binanceFuturesInstrument = [];
        for (let asset of okxSwapAssets) {
            if (bnFuturesAssets.has(asset) && validInstIDs.includes(asset)) {
                okxSwapInstrument.push(`${asset}-USDT-SWAP`);
                binanceFuturesInstrument.push(
                    `${bnFuturesAssetMap[asset]}USDT`
                );
            }
        }
        console.log(okxSwapInstrument, binanceFuturesInstrument);
    } catch (e) {
        console.error(e);
    }
};
main();
