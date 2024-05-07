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
    market: configs.market,
    localAddress: configs.okxLocalAddress[account],
};
const exchangeClient = new OkxClient(options);

const loadSymbolToCtValMap = async () => {
    let symbols = [];
    const result = await client.getInstruments("SWAP");
    if (result != null && result.length > 0) {
        symbols = result
            .filter(
                (item) =>
                    item.state == "live" && item.instId.indexOf("USDT") != -1
            )
            .map((item) => {
                return {
                    symbol: item.instId,
                    ctMult: item.ctMult,
                    ctVal: item.ctVal,
                };
            });
    }
    let symbolToCtValMap = {};
    if (symbols.length > 0) {
        for (let symbolInfo of symbols) {
            symbolToCtValMap[symbolInfo.symbol] = parseFloat(symbolInfo.ctVal);
        }
    }
    return symbolToCtValMap;
};

const getTradingAmt = async (symbolToCtValMap, begin, end, symbol = "") => {
    let totalTradingAmt = 0; // 总交易量
    let hasMoreData = true; // 是否还有更多数据
    let after = null; // 请求参数：请求此ID之前（更旧的数据）的分页内容
    let limit = 100; // 每页数量，默认为 100

    try {
        // 循环获取订单历史记录
        let i = 0;
        while (hasMoreData) {
            let param = {
                instType: "SWAP",
                begin,
                end,
                limit,
            };
            if (after != null) {
                param["after"] = after;
            }
            if (symbol != null) {
                param["instId"] = symbol;
            }

            const filledOrders = await client.getFillsHistory(param);

            if (filledOrders.length > 0) {
                // 遍历订单记录并计算交易量
                filledOrders.forEach((order) => {
                    i++;
                    totalTradingAmt +=
                        parseFloat(order.fillSz) *
                        parseFloat(order.fillPx) *
                        parseFloat(symbolToCtValMap[order.instId]);
                });

                // 如果有更多数据，则更新请求参数
                if (filledOrders.length === limit) {
                    after = filledOrders[filledOrders.length - 1].ordId; // 设置 after 参数为当前页最后一个订单的 ordId
                } else {
                    hasMoreData = false; // 没有更多数据了，结束循环
                }
            } else {
                console.error("Error fetching order history:", filledOrders);
                break;
            }
            await sleep(500);
        }
        console.log(`filled ${i} orders`);
        return totalTradingAmt;
    } catch (e) {
        console.error("getTradingAmount", e);
        return 0;
    }
};

const main = async () => {
    try {
        const instruments = await exchangeClient.getInstruments("SWAP");
        let symbolToCtValMap = {};
        if (instruments.length > 0) {
            for (let instInfo of instruments) {
                symbolToCtValMap[instInfo.instID] = parseFloat(instInfo.ctVal);
            }
        }

        const end = new Date().getTime();
        const start = new Date(end - 24 * 60 * 60 * 1000).getTime();

        const result = await exchangeClient.getTradingAmount(
            symbolToCtValMap,
            start,
            end,
            ""
        );
        console.log(result);
    } catch (e) {
        console.error(e);
    }
};
main();
