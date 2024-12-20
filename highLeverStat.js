const redis = require("redis");
const protobuf = require("protobufjs");
const AsyncLock = require("async-lock");
const { scheduleLoopTask, sleep, fileExists } = require("./utils/run.js");
const { log } = require("./utils/log.js");
const OkxClient = require("./clients/okx.js");
const StatOrderService = require("./services/statOrder.js");
const LimiterService = require("./services/limiter.js");
const TgService = require("./services/tg.js");
const cfgFile = `./configs/config.json`;
if (!fileExists(cfgFile)) {
    log(`config file ${cfgFile} does not exits`);
    process.exit();
}
const configs = require(cfgFile);

const { account } = require("minimist")(process.argv.slice(2));
if (account == null) {
    log("node stat.js --account=xxx");
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

// 初始化同步锁
const lock = new AsyncLock();

// 初始化stat order service
const statOrderService = new StatOrderService();

// 初始化tg service
const tgService = new TgService();

// 初始化Redis服务
let publisher; // Declare at a higher scope
const setupPublisher = async () => {
    publisher = redis.createClient({
        url: `redis://default:${process.env.REDIS_PASS}@${process.env.REDIS_IPC}`,
    });

    publisher.on("error", async (err) => {
        console.error("Redis error:", err);
        await sleep(1000);
        setupPublisher();
    });
    await publisher.connect();
};

const limiter = new LimiterService(2, 24 * 60 * 60 * 1000);
const tgLimiter = new LimiterService(2, 60 * 1000);
let noOrders = 0;
let maxNoOrdersTime = 5;
let highLeverageAcctCfg = configs.highLeverageAcct[account];
let closing = false; // 是否在平仓中
let triggerDeposit = false;
let maxRetries = 3;
let retryCooldown = 500;
let volContractMap = {};
const loadVolContractInfo = async () => {
    let insts = await exchangeClient.getInstruments("SWAP");
    insts = insts.filter((item) => item.instID.indexOf("USDC") == -1);
    for (let inst of insts) {
        volContractMap[inst.instID] = parseFloat(inst.ctVal);
    }
};

const positionUpdateHandler = async (positions) => {
    for (let pos of positions) {
        if (pos.liqPrice > 0) {
            const diffPrice = Math.abs(pos.liqPrice - pos.markPrice);
            const diffRatio = diffPrice / pos.liqPrice;

            if (diffRatio <= highLeverageAcctCfg.priceThres) {
                log(
                    `${pos.symbol} markPrice:${pos.markPrice} liqPrice:${pos.liqPrice} diffRatio:${diffRatio} priceThreshold:${highLeverageAcctCfg.priceThres}`
                );

                // 发送停止下单的消息
                await sendSignal(account, "STOP");

                // 平仓
                const success = await closePositions();
                if (success) {
                    triggerDeposit = true;
                }
            } else {
                log(`${pos.symbol} normal diffRatio:${diffRatio}`);
            }
        } else {
            log(`${pos.symbol} normal liqPrice:${pos.liqPrice}`);
        }
    }
};

const orderUpdateHandler = async (orders) => {
    for (let order of orders) {
        // 使用clientOrderId作为锁的key，避免并发引起的更新错误
        const clientOrderId = order.clientOrderId;
        await lock.acquire(clientOrderId, async () => {
            if (["FILLED"].includes(order.orderStatus)) {
                const symbol = order.symbol;
                if (!volContractMap.hasOwnProperty(symbol)) {
                    console.error(`${symbol}'s ctVal configuration is missing`);
                    return;
                }

                const side = order.side;
                const quantity = order.originalQuantity;
                const amount = quantity * parseFloat(volContractMap[symbol]);
                const price = order.lastFilledPrice;
                const notional = price * amount;
                const maker = order.isMaker;

                const msg = `${account} ${clientOrderId} ${symbol} ${side} ${order.orderStatus} ${amount}@${price} Maker(${maker})`;
                log(msg);

                // 将订单写入数据库
                await statOrderService.saveOrder(`tb_order_${account}`, {
                    symbol,
                    side,
                    quantity,
                    amount,
                    price,
                    notional,
                    maker,
                });
            }
        });
    }
};

const scheduleStatProfit = () => {
    scheduleLoopTask(async () => {
        try {
            const tickersMap = await exchangeClient.getFuturesTickers();
            const balances = await exchangeClient.getFuturesBalances();
            let usdtBalanceArr = balances
                .filter((item) => item.asset == "USDT")
                .map((item) => item.balance);
            const usdtBalance =
                usdtBalanceArr.length == 0 ? 0 : usdtBalanceArr[0];

            let tradingBalance = balances.reduce((total, item) => {
                return total + parseFloat(item.notional);
            }, 0);

            const fundingBalanceArr =
                await exchangeClient.getFundingAccountBalances();
            let fundingBalance = fundingBalanceArr.reduce((total, item) => {
                if (item.asset == "USDT") {
                    return total + parseFloat(item.balance);
                } else {
                    return (
                        total +
                        parseFloat(item.balance) *
                            parseFloat(
                                tickersMap[item.asset + "-USDT-SWAP"]["bestBid"]
                            )
                    );
                }
            }, 0);
            log(
                `tradingBalance=${tradingBalance}, fundingBalance=${fundingBalance}`
            );

            const positions = await exchangeClient.getPositions();
            let notionalBTCETH = 0;
            let notionalOther = 0;
            let positionsNum = 0;
            if (positions != null) {
                for (let position of positions) {
                    positionsNum++;
                    if (
                        ["ETH-USDT-SWAP", "BTC-USDT-SWAP"].includes(
                            position.symbol
                        )
                    ) {
                        notionalBTCETH += position.notional;
                    } else {
                        notionalOther += position.notional;
                    }
                }
            }
            const notionalAll = notionalBTCETH + notionalOther;
            let msg = `${account} USDTBalance=${usdtBalance.toFixed(
                2
            )}|PositionDeltaWithBTCETH=${notionalBTCETH.toFixed(
                2
            )}|PositionDeltaWithoutBTCETH$=${notionalOther.toFixed(
                2
            )}|PositionDeltaAll=${notionalAll.toFixed(
                2
            )}|PositionCount=${positionsNum}`;
            log(msg);

            // 获取margin ratio
            let marginRatio = await exchangeClient.getMarginRatio();
            marginRatio = marginRatio ? marginRatio : 0;

            // 获取openorders数量
            let buyOrdersNum = 0;
            let sellOrdersNum = 0;
            const orders = await exchangeClient.getFuturesOpenOrderList();
            if (orders && orders.length > 1) {
                for (let order of orders) {
                    if (order.side == "BUY") {
                        buyOrdersNum++;
                    } else {
                        sellOrdersNum++;
                    }
                }
                noOrders = 0;
                maxNoOrdersTime = 5;
            } else {
                noOrders++;
                if (noOrders >= maxNoOrdersTime) {
                    if (account != "dcs008" && account != "sma004") {
                        // 报警
                        tgService.sendMsg(`${account} orders numbers warning`);
                        noOrders = 0;
                        maxNoOrdersTime = 2 * maxNoOrdersTime;
                    }
                }
            }

            const ordersNum = buyOrdersNum + sellOrdersNum;
            console.log(
                `The num of open orders is ${ordersNum}(B:${buyOrdersNum}|S:${sellOrdersNum})`
            );

            // 将订单写入数据库
            await statOrderService.saveBalance({
                account,
                usdt_balance: usdtBalance.toFixed(2),
                trading_balance: tradingBalance.toFixed(2),
                funding_balance: fundingBalance.toFixed(2),
                btc_eth_delta: notionalBTCETH.toFixed(2),
                other_delta: notionalOther.toFixed(2),
                total_delta: notionalAll.toFixed(2),
                margin_ratio: marginRatio.toFixed(2),
                orders_num: ordersNum,
                position_count: positionsNum,
            });
        } catch (e) {
            console.error(e);
        }
        await sleep(120 * 1000);
    });
};

const scheduleWithdraw = async () => {
    scheduleLoopTask(async () => {
        try {
            const { usdtBalance, availableUsdtBalance } =
                await getUSDTBalance();
            if (
                usdtBalance >
                    highLeverageAcctCfg.initUsdtBalance +
                        highLeverageAcctCfg.transferThres &&
                availableUsdtBalance > highLeverageAcctCfg.transferThres
            ) {
                // USDT 盈利超过了Threshold，发起平仓 + 划转功能
                log(
                    `[!!!] usdtBalance=${usdtBalance}, availableUsdtBalance=${availableUsdtBalance}, transferThres=${highLeverageAcctCfg.transferThres}`
                );

                await sendSignal(account, "STOP");

                // 获取当前position，市价平仓
                const result = await closePositions();
                if (result) {
                    // 从trading账户中，转transferThres 到funding账户中
                    log(
                        `transfer ${highLeverageAcctCfg.transferThres} USDT from trading account to funding account`
                    );
                    await exchangeClient.trasferAsset(
                        "Trading",
                        "Funding",
                        "USDT",
                        highLeverageAcctCfg.transferThres
                    );

                    await sleep(1000);
                }
                // 有盈利平仓，平仓失败也继续恢复下单
                await sendSignal(account, "START");
            }
        } catch (e) {
            console.error(e);
        }
        await sleep(60 * 1000);
    });
};

const getUSDTBalance = async () => {
    const balances = await exchangeClient.getFuturesBalances();
    let usdtBalanceArr = balances.filter((item) => item.asset == "USDT");

    let usdtBalItem =
        usdtBalanceArr.length == 0
            ? { balance: 0, availableBal: 0 }
            : usdtBalanceArr[0];

    return {
        usdtBalance: usdtBalItem.balance,
        availableUsdtBalance: usdtBalItem.availableBal,
    };
};

const closePositions = async () => {
    // 获取当前position，市价平仓
    if (!closing) {
        closing = true;
        let i = 0;
        let success = true;
        let msg = "";
        while (i < maxRetries) {
            const positions = await exchangeClient.getPositions();
            if (positions != null && positions.length > 0) {
                for (let pos of positions) {
                    if (pos.positionAmt != 0) {
                        const side = pos.positionAmt > 0 ? "SELL" : "BUY";
                        const symbol = pos.symbol;
                        const quantity = Math.abs(pos.positionAmt);
                        log(
                            `close ${symbol} position ${pos.positionAmt} to place market order ${side}, ${quantity}`
                        );

                        let firstOrderQty = Math.floor(quantity / 2);
                        let secondOrderQty = Math.floor(
                            quantity - firstOrderQty
                        );
                        if (firstOrderQty > 0) {
                            const result =
                                await exchangeClient.placeReduceOnlyMarketOrder(
                                    side,
                                    symbol,
                                    firstOrderQty
                                );
                            if (!result.success) {
                                success = false;
                                msg = result.msg;
                            }
                        }
                        if (secondOrderQty > 0) {
                            const result =
                                await exchangeClient.placeReduceOnlyMarketOrder(
                                    side,
                                    symbol,
                                    secondOrderQty
                                );
                            if (!result.success) {
                                success = false;
                                msg = result.msg;
                            }
                        }
                    }
                }
            } else {
                console.log("no positions");
            }

            await sleep(retryCooldown);
            if (!success) {
                i++;
                success = true;
            } else {
                break;
            }
        }
        if (!success) {
            // 报警
            if (tgLimiter.canPerformAction()) {
                tgService.sendMsg(
                    `FAILED to close ${account} position, msg:`,
                    msg
                );
                tgLimiter.performAction();
            }
            closing = false;
            return false;
        }
    }
    closing = false;
    return true;
};

const sendSignal = async (account, signal) => {
    const channel = "control_signal";
    const message = `${account}|${signal}`;

    try {
        const reply = await publisher.publish(channel, message);
        log(`Message published to ${channel}: ${message} (Replies: ${reply})`);
    } catch (e) {
        console.error("Error publishing message:", channel, message, e);
    }
};

const scheduleRiskControl = async () => {
    scheduleLoopTask(async () => {
        try {
            const marginRatio = await exchangeClient.getMarginRatio();
            if (marginRatio <= 1.03) {
                // 发送停止下单的消息
                await sendSignal(account, "STOP");

                // 平仓
                const success = await closePositions();
                if (success) {
                    triggerDeposit = true;
                }
            }
        } catch (e) {
            console.error(e);
        }
        await sleep(5 * 1000);
    });
    scheduleLoopTask(async () => {
        try {
            const positions = await exchangeClient.getPositions();
            if (positions != null && positions.length > 0) {
                positionUpdateHandler(positions);
            }
        } catch (e) {
            console.error(e);
        }
        await sleep(500);
    });
};

const scheduleDeposit = async () => {
    scheduleLoopTask(async () => {
        try {
            // 当需要充值时，才会进入逻辑里面
            if (triggerDeposit) {
                // 没有达到操作上限才可以继续进行
                if (limiter.canPerformAction()) {
                    // 获取Trading Account USDT 余额
                    const { usdtBalance, availableUsdtBalance } =
                        await getUSDTBalance();

                    if (usdtBalance < 0) {
                        log(
                            `${account} Faiiled to Deposit, because Trading Account Balance is less than 0 ${usdtBalance}`
                        );
                        return;
                    }

                    // 获取funding Account USDT 余额
                    const fBalances =
                        await exchangeClient.getFundingAccountBalances();
                    const fUsdtBalance = fBalances[0]
                        ? fBalances[0].balance
                        : 0;

                    const diff =
                        highLeverageAcctCfg.initUsdtBalance - usdtBalance;
                    log(
                        `${account} Trading Account USDT Balance ${usdtBalance}, Funding Account USDT Balance ${fUsdtBalance}`
                    );
                    if (diff > 0 && fUsdtBalance >= diff) {
                        log(
                            `${account}  Transfer ${diff} USDT From Funding Account to Trading Account`
                        );
                        await exchangeClient.trasferAsset(
                            "Funding",
                            "Trading",
                            "USDT",
                            diff
                        );
                        limiter.performAction();
                        triggerDeposit = false;
                        // 发送继续下单的消息
                        await sendSignal(account, "START");
                    } else {
                        if (diff > 0) {
                            tgService.sendMsg(
                                `${account} Funding Account USDT Balance(${fUsdtBalance} < ${diff}) is not enough to deposit`
                            );
                            await sleep(5 * 60 * 1000);
                        } else {
                            // 已通过其他方式充值，重启服务
                            triggerDeposit = false;
                            await sendSignal(account, "START");
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
        await sleep(5 * 1000);
    });
};

const main = async () => {
    await setupPublisher();

    await loadVolContractInfo();
    exchangeClient.initWsEventHandler({
        orders: orderUpdateHandler,
        positions: positionUpdateHandler,
    });
    exchangeClient.wsFuturesOrders();
    exchangeClient.wsFuturesPositions();
    scheduleStatProfit();
    scheduleWithdraw();
    scheduleRiskControl();
    scheduleDeposit();
};
main();
