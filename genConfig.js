const { RestClient, WebsocketClient } = require("okx-api");
const Binance = require("node-binance-api");
const path = require("path");
const {
    getDecimals,
    deleteFilesInDirectory,
    writeStringToFile,
} = require("./utils/run");

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

// 初始化 binance client
let options = {
    family: 4,
    useServerTime: true,
    recvWindow: 10000,
    APIKEY: "",
    APISECRET: "",
};
const binance = new Binance().options(options);
const directory = "./mm-config";
const accountArr = [
    "dcs009",
    "dcs010",
    "dcs011",
    "sma001",
    "sma002",
    "sma003",
    "dcs012",
    "dcs014",
    "dcs015",
];

const firstOrderMarginArr = [
    0.00005, 0.00005, 0.00005, 0.000075, 0.000075, 0.000075, 0.0004, 0.0004,
    0.0004,
];

const firstOrderRangePercentArr = [
    0.00005, 0.00005, 0.00005, 0.00005, 0.00005, 0.00005, 0.0002, 0.0002,
    0.0002,
];

const gapSizePercentArr = [
    0.00025, 0.00025, 0.00025, 0.0004, 0.0004, 0.0004, 0.0015, 0.0015, 0.0015,
];

const forgivePercentArr = [
    1, 1, 0.99995, 0.9999, 0.99985, 0.9998, 0.9995, 0.99925, 0.999,
];

const tickerShiftArr = [
    0.0000025, 0.0000025, 0.0000025, 0.0000025, 0.0000025, 0.0000025, 0.000005,
    0.000005, 0.000005,
];

const volatilityDArr = [3, 2, 2, 2, 2, 2, 1.8, 1.6, 1.4];

const volatilityGArr = [60, 120, 240, 240, 240, 240, 300, 360, 420];

const minimumTickershiftMap = {
    CORE: 100,
    OTHER: 50,
};

const maxPositionMap = {
    CORE: 500,
    OTHER: 250,
};

const breakEvenXArr = [
    0.003, 0.003, 0.003, 0.005, 0.005, 0.005, 0.01, 0.01, 0.01,
];

const main = async () => {
    try {
        deleteFilesInDirectory(directory);

        // 获取okx 支持的futures
        const result = await client.getInstruments("SWAP");
        let okxFuturesMap = {};
        let okxFuturesAsset = new Set();
        if (result != null && result.length > 0) {
            for (let item of result) {
                if (item.state != "live" || item.settleCcy != "USDT") {
                    continue;
                }
                okxFuturesAsset.add(item.ctValCcy);
                okxFuturesMap[item.instId] = {
                    symbol: item.instId,
                    ctMult: item.ctMult,
                    ctVal: item.ctVal,
                    level: item.lever,
                    lotSz: item.lotSz, // 下单数量精度, 对于合约就是张数
                    minSz: item.minSz,
                    tickSz: item.tickSz,
                    maxLmtAmt: item.maxLmtAmt,
                };
            }
        }

        // 获取okx 支持的spot
        const okxSpotResult = await client.getInstruments("SPOT");
        let okxSpotAsset = new Set();
        if (okxSpotResult != null && okxSpotResult.length > 0) {
            for (let symbol of okxSpotResult) {
                if (symbol.state != "live" || symbol.quoteCcy != "USDT") {
                    continue;
                }
                okxSpotAsset.add(symbol.baseCcy);
            }
        }

        // 获取binance支持的futures
        const fResult = await binance.futuresExchangeInfo();
        let bnFuturesBaseAsset = new Set();
        for (let symbol of fResult.symbols) {
            if (
                symbol.contractType != "PERPETUAL" ||
                symbol.quoteAsset != "USDT" ||
                [
                    "USDC",
                    "BUSD",
                    "DAI",
                    "SRM",
                    "HNT",
                    "TOMO",
                    "CVC",
                    "BTS",
                    "SC",
                    "RAY",
                    "FTT",
                    "COCOS",
                    "STRAX",
                ].includes(symbol.baseAsset)
            ) {
                continue;
            }
            bnFuturesBaseAsset.add(symbol.baseAsset);
        }

        // 获取binance智齿的spot
        const sResult = await binance.exchangeInfo();
        let bnSpotBaseAsset = new Set();
        for (let symbol of sResult.symbols) {
            if (
                symbol.quoteAsset != "USDT" ||
                [
                    "USDC",
                    "BUSD",
                    "DAI",
                    "SRM",
                    "HNT",
                    "TOMO",
                    "CVC",
                    "BTS",
                    "SC",
                    "RAY",
                    "FTT",
                    "COCOS",
                    "STRAX",
                ].includes(symbol.baseAsset)
            ) {
                continue;
            }
            bnSpotBaseAsset.add(symbol.baseAsset);
        }

        // 取交集
        // 计算交集
        let intersection = [...okxFuturesAsset].filter(
            (x) =>
                okxSpotAsset.has(x) &&
                bnFuturesBaseAsset.has(x) &&
                bnSpotBaseAsset.has(x)
        );
        let validInstId = [
            "BTC-USDT-SWAP",
            "ETH-USDT-SWAP",
            "MATIC-USDT-SWAP",
            "XRP-USDT-SWAP",
            "SOL-USDT-SWAP",
            "DOGE-USDT-SWAP",
            "1INCH-USDT-SWAP",
            "AAVE-USDT-SWAP",
            "ACH-USDT-SWAP",
            "ADA-USDT-SWAP",
            "ARB-USDT-SWAP",
            "ATOM-USDT-SWAP",
            "AVAX-USDT-SWAP",
            "BNB-USDT-SWAP",
            "CRV-USDT-SWAP",
            "DOT-USDT-SWAP",
            "DYDX-USDT-SWAP",
            "FTM-USDT-SWAP",
            "LINK-USDT-SWAP",
            "LTC-USDT-SWAP",
            "OP-USDT-SWAP",
            "UNI-USDT-SWAP",
        ];

        for (let i = 0; i < accountArr.length; i++) {
            let configs = {};
            for (let j = 0; j < intersection.length; j++) {
                let symbol = intersection[j];
                let instId = `${symbol}-USDT-SWAP`;
                if (!validInstId.includes(instId)) {
                    continue;
                }
                let instCfg = okxFuturesMap[instId];
                configs[instId] = {
                    ContractNum: 1,
                    VolPerCont: parseFloat(instCfg.ctVal),
                    BaseAsset: symbol,
                    Leverage: 10,
                    EffectiveNum: 1,
                    Precision: [getDecimals(instCfg.tickSz), 0],
                    FirstOrderMargin: firstOrderMarginArr[i],
                    FirstOrderRangePercent: firstOrderRangePercentArr[i],
                    GapSizePercent: gapSizePercentArr[i],
                    ForgivePercent: forgivePercentArr[i],
                    TickerShift: tickerShiftArr[i],
                    MaxOrderNum: 3,
                    FarOrderNum: 5,
                    VolatilityE: 0.75,
                    VolatilityD: volatilityDArr[i],
                    VolatilityG: volatilityGArr[i],
                    TickerShiftStartNum: ["BTC", "ETH"].includes(symbol)
                        ? minimumTickershiftMap["CORE"]
                        : minimumTickershiftMap["OTHER"],
                    MaxContractNum: ["BTC", "ETH"].includes(symbol)
                        ? maxPositionMap["CORE"]
                        : maxPositionMap["OTHER"],
                    BreakEvenX: breakEvenXArr[i],
                };
            }
            const formattedJSON = JSON.stringify(configs, null, 4);
            const filePath = path.join(directory, `${accountArr[i]}.json`);
            writeStringToFile(filePath, formattedJSON);
            console.log(JSON.stringify(Object.keys(configs), null, 4));
        }
    } catch (e) {
        console.error(e);
    }
};
main();
