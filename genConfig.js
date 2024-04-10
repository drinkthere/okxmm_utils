const { RestClient, WebsocketClient } = require("okx-api");
const Binance = require("node-binance-api");
const { v4: uuidv4 } = require("uuid");
const { scheduleLoopTask, sleep, fileExists } = require("./utils/run");

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

function getDecimals(numString) {
    numString = numString.replace(/\.?0+$/, "");
    if (numString.includes(".")) {
        let decimalIndex = numString.indexOf(".");
        let decimals = numString.length - decimalIndex - 1;
        return decimals;
    } else {
        return 0;
    }
}

const main = async () => {
    try {
        // 获取okx 支持的futures
        const result = await okx.getInstruments("SWAP");
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
        const okxSpotResult = await okx.getInstruments("SPOT");
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
        ];
        let maxContValMap = {
            "BTC-USDT-SWAP": 30,
            "ETH-USDT-SWAP": 30,
        };
        let paramMap = {
            "BTC-USDT-SWAP": {
                FirstOrderMargin: 0.00025,
                FirstOrderRangePercent: 0.00005,
                GapSizePercent: 0.00025,
                ForgivePercent: 0.999985,
                TickerShift: 0.00002,
            },
            "BTC-USDT-SWAP": {
                FirstOrderMargin: 0.00025,
                FirstOrderRangePercent: 0.00005,
                GapSizePercent: 0.00025,
                ForgivePercent: 0.999985,
                TickerShift: 0.00002,
            },
        };
        let configs = {};
        for (let i = 0; i < intersection.length; i++) {
            let symbol = intersection[i];
            let instId = `${symbol}-USDT-SWAP`;
            if (!validInstId.includes(instId)) {
                continue;
            }
            let instCfg = okxFuturesMap[instId];
            let params = paramMap[instId]
                ? paramMap[instId]
                : {
                      FirstOrderMargin: 0.00025,
                      FirstOrderRangePercent: 0.00005,
                      GapSizePercent: 0.00025,
                      ForgivePercent: 0.999985,
                      TickerShift: 0.00002,
                  };
            let maxContractNum = maxContValMap[instId]
                ? maxContValMap[instId]
                : 10;
            configs[instId] = {
                ContractNum: 1,
                VolPerCont: parseFloat(instCfg.ctVal),
                BaseAsset: symbol,
                Leverage: 10,
                MaxContractNum: maxContractNum,
                EffectiveNum: 1,
                Precision: [getDecimals(instCfg.tickSz), 0],
                FirstOrderMargin: params.FirstOrderMargin,
                FirstOrderRangePercent: params.FirstOrderRangePercent,
                GapSizePercent: params.GapSizePercent,
                ForgivePercent: params.ForgivePercent,
                TickerShift: params.TickerShift,
                MaxOrderNum: 3,
                FarOrderNum: 5,
            };
        }
        console.log(JSON.stringify(configs, null, 4));
        console.log(JSON.stringify(Object.keys(configs), null, 4));
    } catch (e) {
        console.error(e);
    }
};
main();
