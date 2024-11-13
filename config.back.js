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
let okxSpotAssetMap = {};
let bnFuturesAssetMap = {};
let bnSpotAssetMap = {};
let referInstrumentsMap = {};
const directory = "./mm-config";
const accountArr = Object.keys(configs.keyIndexMap);

const getOkxAssetsSet = async (instType) => {
    const insts = await okxClient.getInstruments(instType);
    let assetsSet = new Set();
    for (let inst of insts) {
        var asset;
        if (instType == "SWAP") {
            asset = inst.ctValCcy;
            okxFuturesConfigMap[asset] = inst;
        } else {
            asset = inst.baseCcy;
            okxSpotAssetMap[asset] = inst.instID;
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
        let formattedAsset = asset;
        if (asset.startsWith("1000000")) {
            formattedAsset = asset.replace("1000000", "");
            bnFuturesAssetMap[formattedAsset] = asset;
        } else if (asset.startsWith("1000")) {
            formattedAsset = asset.replace("1000", "");
            bnFuturesAssetMap[formattedAsset] = asset;
        } else {
            // 暂时屏蔽掉1000*XXX的币，价格不方便计算
            assetSet.add(asset);
        }
    }
    return assetSet;
};

const formatBinanceSpotAssets = (bnFuturesAssets) => {
    let assetSet = new Set();
    for (let asset of bnFuturesAssets) {
        let formattedAsset = asset;
        if (asset.startsWith("1000000")) {
            formattedAsset = asset.replace("1000000", "");
            bnSpotAssetMap[formattedAsset] = asset;
        } else if (asset.startsWith("1000")) {
            formattedAsset = asset.replace("1000", "");
            bnSpotAssetMap[formattedAsset] = asset;
        } else {
            assetSet.add(formattedAsset);
        }
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
let config = require("../okxmm/config/config-dcs006.json");
let dcs008Config = require("../okxmm/config/config-dcs008.json");
const main = async () => {
    try {
        deleteFilesInDirectory(directory);

        // 获取okx 支持的futures
        const okxFuturesAssets = await getOkxAssetsSet("SWAP");
        //console.log(okxFuturesConfigMap["BTC"], okxFuturesConfigMap['ETH'], okxFuturesConfigMap['POL']);process.exit();
        // 获取okx futures 价格
        const tickerMap = await okxClient.getFuturesTickers();

        // 获取okx 支持的spot
        const okxSpotAssets = await getOkxAssetsSet("SPOT");

        // 获取binance支持的futures
        let bnFuturesAssets = await getBinanceAssetsSet("FUTURES");
        bnFuturesAssets = formatBinanceFuturesAssets(bnFuturesAssets);
        // for (key of Object.keys(bnFuturesAssetMap)) {
        //     if (key != bnFuturesAssetMap[key]) {
        //         console.log(key, bnFuturesAssetMap[key])
        //     }
        // }

        // 获取binance支持的spot
        let bnSpotAssets = await getBinanceAssetsSet("SPOT");
        bnSpotAssets = formatBinanceSpotAssets(bnSpotAssets);
        // for (key of Object.keys(bnSpotAssetMap)) {
        //     if (key != bnSpotAssetMap[key]) {
        //         console.log(key, bnSpotAssetMap[key])
        //     }
        // }

        // 以okx为主，生成配置信息

        let okxSwapInsts = [];
        let okxSpotInsts = [];
        let bnFuturesInsts = [];
        let bnSpotInsts = [];
        for (let asset of okxFuturesAssets) {
            if (["BTC", "ETH"].includes(asset)) {
                continue;
            }
            if (
                okxSpotAssets.has(asset) &&
                bnFuturesAssets.has(asset) &&
                bnSpotAssets.has(asset)
            ) {
                const instInfo = okxFuturesConfigMap[asset];
                okxSwapInsts.push(instInfo["instID"]);
                okxSpotInsts.push(okxSpotAssetMap[asset]);
                bnFuturesInsts.push(bnFuturesAssetMap[asset]);
                bnSpotInsts.push(bnSpotAssetMap[asset]);
            }
        }
        //console.log(okxSwapInsts.length, okxSpotInsts.length, bnFuturesInsts.length, bnSpotInsts.length);process.exit();
        okxSwapInsts = okxSwapInsts.filter(
            (item) => !dcs008Config["InstIDs"].includes(item)
        );
        instConfigs = {};
        for (let inst of okxSwapInsts) {
            const asset = inst.replace("-USDT-SWAP", "");
            const instInfo = okxFuturesConfigMap[asset];
            instConfigs[inst] = {
                ContractNum: 10,
                VolPerCont: parseFloat(instInfo.ctVal),
                BaseAsset: asset,
                Leverage: 10,
                EffectiveNum: 1,
                Precision: [
                    getDecimals(instInfo.tickSz),
                    getDecimals(instInfo.lotSz),
                ],
                FirstOrderMargin: 0.0005,
                FirstOrderRangePercent: 0.0005,
                GapSizePercent: 0.0005,
                ForgivePercent: 0.9992,
                TickerShift: 0.000025,
                MaxOrderNum: 3,
                FarOrderNum: 5,
                VolatilityE: 0.75,
                VolatilityD: 4,
                VolatilityG: 500,
                MinimumTickerShift: 20,
                MaximumTickerShift: 40,
                PositionReduceFactor: 20,
                PositionOffset: 0,
                MaxContractNum: 1000,
                BreakEvenX: -0.5,
            };
        }

        config["InstIDs"] = okxSwapInsts;
        config["TickerForwardIPC"] = {
            BinanceSpotAltCoin: "tcp://127.0.0.1:55554",
            BinanceFuturesAltCoin: "tcp://127.0.0.1:55559",
        };
        config["InstIDConfigs"] = instConfigs;
        config["MaxErrorsPerMinute"] = 200;
        config["FarOrderCancelFreq"] = 2000;

        let formattedJSON = JSON.stringify(config, null, 4);
        const filePath = path.join(directory, `config-dcs006.json`);
        writeStringToFile(filePath, formattedJSON);
        console.log(formattedJSON);
    } catch (e) {
        console.error(e);
    }
};
main();
