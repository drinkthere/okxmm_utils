const { RestClient, WebsocketClient } = require("../okx-api");
const { v4: uuidv4 } = require("uuid");
const http = require("https");
const https = require("https");
const { sleep, convertScientificToString } = require("../utils/run");
const { Console } = require("console");

class OkxClient {
    constructor(options = {}) {
        const logger = {
            silly: (...params) => {},
            debug: (...params) => {},
            notice: (...params) => {},
            info: (...params) => {},
            warning: (...params) => {},
            error: (...params) => {},

            // silly: (...params) => console.log('silly', ...params),
        };

        const market = options.hasOwnProperty("market")
            ? options["market"]
            : "prod";

        if (options.hasOwnProperty("localAddress")) {
            const localAddress = options["localAddress"];
            const httpAgent = new http.Agent({ localAddress, timeout: 30000 });
            const httpsAgent = new https.Agent({
                localAddress,
                timeout: 30000,
            });
            this.client = new RestClient(
                {
                    apiKey: options.API_KEY,
                    apiSecret: options.API_SECRET,
                    apiPass: options.API_PASSWORD,
                },
                market,
                {},
                { httpAgent, httpsAgent }
            );

            this.wsClient = new WebsocketClient(
                {
                    accounts: [
                        {
                            apiKey: options.API_KEY,
                            apiSecret: options.API_SECRET,
                            apiPass: options.API_PASSWORD,
                        },
                    ],
                    market: market,
                    requestOptions: { agent: httpsAgent },
                },
                logger
            );
        } else {
            this.client = new RestClient(
                {
                    apiKey: options.API_KEY,
                    apiSecret: options.API_SECRET,
                    apiPass: options.API_PASSWORD,
                },
                market
            );

            this.wsClient = new WebsocketClient(
                {
                    accounts: [
                        {
                            apiKey: options.API_KEY,
                            apiSecret: options.API_SECRET,
                            apiPass: options.API_PASSWORD,
                        },
                    ],
                    market: market,
                },
                logger
            );
        }
    }

    initWsEventHandler(handlers) {
        this.handlers = handlers;
        this.wsClient.on("update", (event) => {
            if (
                event != null &&
                event.arg != null &&
                event.arg.channel != null
            ) {
                let handler;
                switch (event.arg.channel) {
                    case "positions":
                        handler = handlers["positions"];
                        if (handler != null) {
                            const stdPositions = this._formatPositions(
                                event.data
                            );
                            handler(stdPositions);
                        }
                        break;
                    case "orders":
                        handler = handlers["orders"];
                        if (handler != null) {
                            const stdOrders = this._formatOrders(event.data);
                            handler(stdOrders);
                        }
                        break;
                    case "tickers":
                        handler = handlers["tickers"];
                        if (handler != null) {
                            // const stdTickers = this._formatTickers(event.data);
                            // handler(stdTickers);
                            handler(event);
                        }
                        break;
                    case "account":
                        handler = handlers["account"];
                        if (handler != null) {
                            handler(event.data);
                        }
                        break;
                }
            }
        });
    }

    // 将position格式化成标准输出
    _formatPositions(positions) {
        let stdPositions = [];
        for (let item of positions) {
            let notional = 0;
            if (item.pos > 0) {
                notional = parseFloat(item.notionalUsd);
            } else if (item.pos < 0) {
                notional = -parseFloat(item.notionalUsd);
            }

            let pos = {
                symbol: item.instId,
                unrealizedProfit: parseFloat(item.upl),
                positionAmt: parseFloat(item.pos),
                entryPrice: parseFloat(item.avgPx),
                markPrice: parseFloat(item.markPx),
                liqPrice: parseFloat(item.liqPx),
                notional: notional,
            };
            stdPositions.push(pos);
        }
        return stdPositions;
    }

    _formatOrders(orders) {
        let finalOrders = [];
        orders.forEach((o) => {
            let executionType = "";
            let state = o.state;
            if (o.amendResult !== "") {
                // 修改订单的时候，order status设置程'NEW'与币安统一。
                executionType = "AMENDMENT";
                state = "live";
            }
            let order = {
                symbol: o.instId,
                clientOrderId: o.clOrdId,
                side: o.side.toUpperCase(),
                price: parseFloat(o.px),
                lastFilledPrice: parseFloat(o.fillPx),
                orderStatus: this._formatOrderStatus(state),
                executionType: executionType, // 用这个来标识是否是修改订单
                isMaker: o.execType == "M" ? 1 : 0,
                originalPrice: parseFloat(o.px),
                originalQuantity: parseFloat(o.sz),
                orderTime: parseInt(o.uTime),
                filledQuantity: parseFloat(o.fillSz),
                filledNotional: o.fillNotionalUsd,
            };
            finalOrders.push(order);
        });
        return finalOrders;
    }

    _formatOrderStatus(state) {
        switch (state) {
            case "live":
                return "NEW";
            case "canceled":
                return "CANCELED";
            case "partially_filled":
                return "PARTIALLY_FILLED";
            case "filled":
                return "FILLED";
            default:
                return state;
        }
    }

    _formatTickers(tickers) {
        if (tickers.length == 0) {
            return null;
        }
        const ticker = tickers[0];
        return {
            symbol: ticker.instId,
            bestBid: ticker.bidPx,
            bestAsk: ticker.askPx,
        };
    }

    // 获取指定symbols的open中的order list
    async getFuturesLeverage(instId) {
        try {
            const resp = await this.client.getLeverage(instId, "cross");
            return resp[0].lever;
        } catch (error) {
            console.error("getFuturesOpenOrderList:", error);
        }
    }

    // 获取指定symbols的open中的order list
    async getFuturesOpenOrderList() {
        let allOrders = [];
        let afterOrderId = "";
        try {
            while (true) {
                const pageOrders = await this.client.getOrderList({
                    instType: "SWAP",
                    after: afterOrderId,
                    limit: 100, // 每页最多100条
                });

                // 如果没有订单了，退出循环
                if (pageOrders.length === 0) {
                    break;
                }

                // 将这一页的订单添加到总订单列表中
                allOrders = allOrders.concat(pageOrders);

                // 获取最后一条订单的 orderId
                afterOrderId = pageOrders[pageOrders.length - 1].ordId;
            }
        } catch (error) {
            console.error("getFuturesOpenOrderList:", error);
        }

        if (allOrders == null || allOrders.length == 0) {
            return [];
        }

        return this._formatOrders(allOrders);
    }

    async getFuturesFilledOrders(instId, begin, end) {
        let allOrders = [];
        let hasMoreData = true; // 是否还有更多数据
        let before = null; // 请求参数：请求此ID之前（更旧的数据）的分页内容
        let limit = 100; // 每页数量，默认为 100

        try {
            let i = 0;
            // 循环获取订单历史记录
            while (hasMoreData) {
                let param = {
                    instType: "SWAP",
                    begin,
                    end,
                    limit,
                };
                if (before != null) {
                    param["before"] = before;
                }
                if (instId != null) {
                    param["instId"] = instId;
                }

                const filledOrders = await this.client.getFills(param);

                // 如果有更多数据，则更新请求参数
                if (filledOrders.length === limit) {
                    before = filledOrders[filledOrders.length - 1].ordId; // 设置 after 参数为当前页最后一个订单的 ordId
                } else {
                    hasMoreData = false; // 没有更多数据了，结束循环
                }

                if (filledOrders.length > 0) {
                    // 将这一页的订单添加到总订单列表中
                    allOrders = allOrders.concat(filledOrders);
                } else {
                    console.error("Error fetching filled order", filledOrders);
                    break;
                }
                await sleep(100);
            }
            return allOrders;
        } catch (e) {
            console.error("getTradingAmount", e);
            return 0;
        }

        let afterOrderId = "";
        try {
            while (true) {
                const pageOrders = await this.client.getFills({
                    instType: "SWAP",
                    instId,
                    after: afterOrderId,
                    limit: 100, // 每页最多100条
                });

                // 如果没有订单了，退出循环
                if (pageOrders.length === 0) {
                    break;
                }

                // 将这一页的订单添加到总订单列表中
                allOrders = allOrders.concat(pageOrders);

                // 获取最后一条订单的 orderId
                afterOrderId = pageOrders[pageOrders.length - 1].ordId;
            }
        } catch (error) {
            console.error("getFuturesOpenOrderList:", error);
        }

        if (allOrders == null || allOrders.length == 0) {
            return [];
        }

        return allOrders;
    }

    // 设置symbol的杠杆
    async setFuturesLeverage(symbol, leverage) {
        try {
            return await this.client.setLeverage({
                instId: symbol,
                lever: leverage,
                mgnMode: "cross",
            });
        } catch (e) {
            console.error("setFuturesLeverage", symbol, leverage, e);
        }
    }

    // 获取futures account的信息
    async getPositions() {
        try {
            let positions = await this.client.getPositions();
            if (positions == null || positions.length == 0) {
                return null;
            }

            // 过滤出永续合约的positions
            positions = positions.filter((pos) => pos.instType == "SWAP");
            if (positions == null || positions.length == 0) {
                return null;
            }

            return this._formatPositions(positions);
        } catch (e) {
            console.error("getPositions", e);
        }
    }

    async getSpotBalances(ccy) {
        try {
            let result = [];
            if (ccy != null) {
                result = await this.client.getBalance(ccy);
            } else {
                result = await this.client.getBalance();
            }
            if (result != null && result.length > 0) {
                return result[0]["details"];
            }
        } catch (e) {
            console.error("getSpotBalances", e);
        }
    }

    async getMargin() {
        try {
            const result = await this.client.getBalance();
            return result;
        } catch (e) {
            console.error("getMargin", e);
        }
    }

    async getMarginRatio() {
        try {
            let marginRatio = 0;
            const result = await this.client.getBalance();
            if (result != null && result.length > 0) {
                marginRatio = parseFloat(result[0]["mgnRatio"]);
            }
            return marginRatio;
        } catch (e) {
            console.error("getMarginRatio", e);
        }
    }

    genClientOrderId(cid = null, key = null) {
        if (cid == null) {
            if (key == null) {
                return `OX${uuidv4().slice(0, -6).replaceAll("-", "")}`;
            } else {
                return `OX${uuidv4().slice(0, -6).replaceAll("-", "")}X${key}`; // 为了确保满足交易所要求，这里截掉一部分uuid的长度
            }
        } else {
            // 传了cid，是用于通过open订单的cid生成close订单的cid，这里将OX替换成CX
            return cid.replaceAll("OX", "CX");
        }
    }

    async wsPlaceFuturesOrder(side, symbol, quantity, price, params) {
        side = side.toLowerCase();
        const request = {
            id: params.newClientOrderId,
            op: "order",
            args: [
                {
                    side: side,
                    instId: symbol,
                    ordType: "post_only",
                    px: price,
                    sz: quantity + "",
                    tdMode: "cross",
                    clOrdId: params.newClientOrderId,
                },
            ],
        };
        this.wsClient.placeOrder(request);
    }

    async placeFuturesOrder(side, symbol, quantity, price, params) {
        price = convertScientificToString(price);
        try {
            side = side.toLowerCase();
            const posSide = side == "buy" ? "long" : "short";
            const order = {
                instId: symbol,
                ordType: "post_only", // 后续可以根据params中的数据读取
                side,
                // posSide,
                px: price,
                sz: quantity + "",
                tdMode: "cross",
                clOrdId: params.newClientOrderId,
            };
            await this.client.submitOrder(order);
            return {
                symbol: order.instId,
                status: "NEW",
                clientOrderId: order.clOrdId,
                side: order.side.toUpperCase(),
                origQty: order.sz,
            };
        } catch (e) {
            console.error(
                "placeFuturesOrder",
                side,
                symbol,
                quantity,
                price,
                params,
                e
            );
            if (e.data && e.data.length > 0) {
                const errorInfo = e.data[0];
                return {
                    code: errorInfo.sCode,
                    clientOrderId: errorInfo.clOrdId,
                    msg: errorInfo.sMsg,
                };
            }
        }
    }

    async placeMarketOrder(side, symbol, quantity, params = {}) {
        try {
            side = side.toLowerCase();
            const order = {
                instId: symbol,
                ordType: "market", // 后续可以根据params中的数据读取
                side,
                sz: quantity + "",
                tdMode: "cross",
            };
            if (params["newClientOrderId"] != null) {
                order["clOrdId"] = params.newClientOrderId;
            }
            await this.client.submitOrder(order);
            return {
                symbol: order.instId,
                status: "NEW",
                clientOrderId: order.clOrdId,
                side: order.side.toUpperCase(),
                origQty: order.sz,
            };
        } catch (e) {
            console.log(side, symbol, quantity, params, e);
            if (e.data && e.data.length > 0) {
                const errorInfo = e.data[0];
                return {
                    code: errorInfo.sCode,
                    clientOrderId: errorInfo.clOrdId,
                    msg: errorInfo.sMsg,
                };
            }
        }
    }

    async batchPlaceFuturesOrders(orderList, isRateLimit = true) {
        try {
            if (orderList.length == 1) {
                const param = orderList[0];
                await this.placeFuturesOrder(
                    param.side,
                    param.symbol,
                    param.quantity,
                    param.price,
                    {
                        newClientOrderId: param.newClientOrderId,
                    }
                );
            } else {
                const batchOrders = orderList.map((order) => {
                    const side = order.side.toLowerCase();
                    const posSide = side == "buy" ? "long" : "short";
                    return {
                        instId: order.symbol,
                        ordType: "post_only", // 后续可以根据params中的数据读取
                        side,
                        // posSide,
                        px: convertScientificToString(order.price),
                        sz: order.quantity + "",
                        tdMode: "cross",
                        clOrdId: order.newClientOrderId,
                    };
                });
                const batchSize = 6;
                while (batchOrders.length > 0) {
                    const batchParams = batchOrders.splice(0, batchSize);
                    await this.client.submitMultipleOrders(batchParams);

                    // 休眠一段时间，防止请求频率过快（根据 API 限制而定）
                    await sleep(20);
                }
            }
        } catch (e) {
            console.error("batchPlaceFuturesOrders", orderList, e);
        }
    }

    async modifyFuturesOrder(symbol, params) {
        const newPrice = convertScientificToString(params.price);
        try {
            const newOrder = {
                instId: symbol,
                cxlOnFail: true,
                clOrdId: params.origClientOrderId,
                newSz: params.quantity + "",
                newPx: newPrice,
            };
            const orderResults = await this.client.amendOrder(newOrder);
            if (orderResults && orderResults.length > 0) {
                const result = orderResults[0];
                if (result && result.sCode == 0) {
                    return {
                        symbol,
                        clientOrderId: result.clOrdId,
                        status: "NEW",
                        side: params.side,
                    };
                } else {
                    console.log("cancelFuturesOrder", symbol, params, result);
                    return {};
                }
            }
        } catch (e) {
            if (e && e.code != 0 && e.data) {
                if (e.data.length > 0) {
                    const result = e.data[0];
                    // 0 成功
                    // 51400 撤单失败，订单已撤销
                    // 51410 撤单失败, 订单已处于撤单中
                    // 51503 订单不存在或已完成，导致改单失败
                    if (
                        result.sCode != 0 &&
                        result.sCode != 51400 &&
                        result.sCode != 51503 &&
                        result.sCode != 51410
                    ) {
                        // 51008 下单余额保证金不足
                        // 51502 修改订单余额保证金不足
                        // 51016 clientOrderId 重复
                        // 51006 买入价格超出限价范围
                        // 50022 强平冻结中
                        // 51000 参数错误
                        console.error(
                            "cancelFuturesOrder",
                            symbol,
                            params.origClientOrderId,
                            result.sCode,
                            result.sMsg
                        );
                        return {};
                    } else {
                        console.log(
                            "cancelFuturesOrder",
                            symbol,
                            params.origClientOrderId,
                            result
                        );
                        return {};
                    }
                }
            } else {
                console.error("modifyFuturesOrder", symbol, params, e);
                return {};
            }
        }
    }

    // 批量修改orders
    async batchModifyFuturesOrders(orderList) {
        try {
            if (orderList.length == 1) {
                const param = orderList[0];
                return await this.modifyFuturesOrder(param.symbol, param);
            } else {
                const batchOrders = orderList.map((order) => {
                    return {
                        instId: order.symbol,
                        cxlOnFail: true,
                        clOrdId: order.origClientOrderId,
                        newSz: order.quantity + "",
                        newPx: convertScientificToString(order.price),
                    };
                });

                let result = [];
                // 修改通常要及时完成，这里先不做频率限制，OK文档中没有对最大数量做限制，可以取最大订单数量，默认是每侧3单，共6单
                const batchSize = 6;
                while (batchOrders.length > 0) {
                    const batchParams = batchOrders.splice(0, batchSize);
                    const amendResult = await this.client.amendMultipleOrders(
                        batchParams
                    );
                    await sleep(20);
                }
            }
        } catch (e) {
            console.error("batchModifyFuturesOrders", orderList, e);
        }
    }

    async wsCancelFuturesOrder(symbol, clientOrderId) {
        const request = {
            id: clientOrderId,
            op: "cancel-order",
            args: [
                {
                    instId: symbol,
                    clOrdId: clientOrderId,
                },
            ],
        };
        this.wsClient.cancelOrder(request);
    }

    async cancelFuturesOrder(symbol, clientOrderId) {
        try {
            this.client.cancelOrder({
                instId: symbol,
                clOrdId: clientOrderId,
            });
        } catch (e) {
            if (e && e.code != 0 && e.data) {
                if (e.data.length > 0) {
                    for (let result of e.data) {
                        // 0 成功
                        // 51400 撤单失败，订单已撤销
                        // 51410 撤单失败, 订单已处于撤单中
                        // 51503 订单不存在或已完成，导致改单失败
                        if (
                            result.sCode != 0 &&
                            result.sCode != 51400 &&
                            result.sCode != 51503 &&
                            result.sCode != 51410
                        ) {
                            // 51008 下单余额保证金不足
                            // 51502 修改订单余额保证金不足
                            // 51016 clientOrderId 重复
                            // 51006 买入价格超出限价范围
                            // 50022 强平冻结中
                            // 51000 参数错误
                            console.error(
                                "cancelFuturesOrder",
                                symbol,
                                clientOrderId,
                                e
                            );
                        }
                    }
                }
            } else {
                console.error("cancelFuturesOrder", symbol, clientOrderId, e);
            }
        }
    }

    // 根据clientOrderId批量取消订单
    async batchCancelFuturesOrdersByCids(symbol, clientOrderIds) {
        try {
            if (clientOrderIds.length == 1) {
                await this.cancelFuturesOrder(symbol, clientOrderIds[0]);
            } else {
                // 取消通常要及时完成，这里先不做频率限制
                const batchSize = 10;
                while (clientOrderIds.length > 0) {
                    const batchIds = clientOrderIds.splice(0, batchSize);
                    const batchParams = batchIds.map((cid) => {
                        return { instId: symbol, clOrdId: cid };
                    });
                    await this.client.cancelMultipleOrders(batchParams);
                }
            }
        } catch (e) {
            console.error(
                "batchCancelFuturesOrdersByCids",
                symbol,
                clientOrderIds,
                e
            );
        }
    }

    async cancelAllFuturesOrders(symbol) {
        try {
            const allOpenOrders = await this.getFuturesOpenOrderList();
            const allSymbolOrders = allOpenOrders.filter(
                (order) => order.symbol === symbol
            );
            if (allSymbolOrders.length == 0) {
                return;
            }

            const cancelCliendOrderIds = allSymbolOrders.map(
                (order) => order.clientOrderId
            );
            return await this.batchCancelFuturesOrdersByCids(
                symbol,
                cancelCliendOrderIds
            );
        } catch (e) {
            console.error("cancelAllFuturesOrders", symbol, e);
        }
    }

    async cancelAll(clientOrderIdMap) {
        for (let symbol of Object.keys(clientOrderIdMap)) {
            this.batchCancelFuturesOrdersByCids(
                symbol,
                clientOrderIdMap[symbol]
            );
        }
    }

    async placeSpotMarketOrder(side, symbol, quantity, tgtCcy, params = {}) {
        try {
            side = side.toLowerCase();
            const order = {
                instId: symbol,
                ordType: "market",
                side,
                sz: quantity + "",
                tgtCcy: tgtCcy,
                tdMode: "cross",
            };
            if (params["newClientOrderId"] != null) {
                order["clOrdId"] = params.newClientOrderId;
            }
            await this.client.submitOrder(order);
            return {
                symbol: order.instId,
                status: "NEW",
                clientOrderId: order.clOrdId,
                side: order.side.toUpperCase(),
                origQty: order.sz,
            };
        } catch (e) {
            console.log(side, symbol, quantity, params, e);
            if (e.data && e.data.length > 0) {
                const errorInfo = e.data[0];
                return {
                    code: errorInfo.sCode,
                    clientOrderId: errorInfo.clOrdId,
                    msg: errorInfo.sMsg,
                };
            }
        }
    }

    async getFuturesBalances() {
        const result = await this.client.getBalance();
        const details = result[0].details;
        const ret = [];
        for (let detail of details) {
            ret.push({
                asset: detail.ccy,
                balance: parseFloat(detail.eq),
                availableBal: parseFloat(detail.availBal),
                notional: parseFloat(detail.disEq),
            });
        }
        return ret;
    }

    async getFundingAccountBalances() {
        const details = await this.client.getBalances();
        if (!details || details.length == 0) {
            return [];
        }

        const ret = [];
        if (details && details.length > 0) {
            for (let detail of details) {
                ret.push({
                    asset: detail.ccy,
                    balance: detail.bal,
                });
            }
        }

        return ret;
    }

    async getInstruments(instType) {
        try {
            const result = await this.client.getInstruments(instType);
            if (result != null && result.length > 0) {
                return result
                    .filter(
                        (item) =>
                            item.state == "live" &&
                            item.instId.indexOf("USDT") != -1
                    )
                    .map((item) => {
                        return {
                            instID: item.instId,
                            baseCcy: item.baseCcy,
                            ctValCcy: item.ctValCcy,
                            ctMult: item.ctMult,
                            ctVal: item.ctVal,
                            level: item.lever,
                            lotSz: item.lotSz, // 下单数量精度, 对于合约就是张数
                            minSz: item.minSz,
                            tickSz: item.tickSz,
                            maxLmtAmt: item.maxLmtAmt,
                        };
                    });
            }
        } catch (e) {
            console.error("getFuturesSymbols", e);
        }
        return [];
    }

    async getMaxContNum(symbol, leverage) {
        return await this.client.getMaxBuySellAmount({
            instId: symbol,
            tdMode: "cross",
            leverage: leverage,
        });
    }

    // 获取futures tickers信息
    async getFuturesTickers() {
        try {
            let tickers = await this.client.getTickers("SWAP");
            if (tickers == null || tickers.length == 0) {
                return null;
            }
            let result = {};
            for (let ticker of tickers) {
                const stdTicker = this._formatTickers([ticker]);
                result[stdTicker.symbol] = stdTicker;
            }
            return result;
        } catch (e) {
            console.error("getFuturesTickers", e);
        }
    }

    async getAccountInfo() {
        return await this.client.getAccountConfiguration();
    }

    async getFeeRates(instType) {
        return await this.client.getFeeRates(instType);
    }

    async getTradingAmount(symbolToCtValMap, begin, end, symbol = null) {
        let totalTradingAmt = 0; // 总交易量
        let hasMoreData = true; // 是否还有更多数据
        let before = null; // 请求参数：请求此ID之前（更旧的数据）的分页内容
        let limit = 100; // 每页数量，默认为 100

        try {
            let i = 0;
            // 循环获取订单历史记录
            while (hasMoreData) {
                let param = {
                    instType: "SWAP",
                    begin,
                    end,
                    limit,
                };
                if (before != null) {
                    param["before"] = before;
                }
                if (symbol != null) {
                    param["instId"] = symbol;
                }

                const filledOrders = await this.client.getFillsHistory(param);
                if (filledOrders.length > 0) {
                    // 遍历订单记录并计算交易量
                    filledOrders.forEach((order) => {
                        // console.log(order.ordId, order.fillTime)
                        totalTradingAmt +=
                            parseFloat(order.fillSz) *
                            parseFloat(order.fillPx) *
                            parseFloat(symbolToCtValMap[order.instId]);
                    });

                    // 如果有更多数据，则更新请求参数
                    if (filledOrders.length === limit) {
                        before = filledOrders[filledOrders.length - 1].ordId; // 设置 after 参数为当前页最后一个订单的 ordId
                    } else {
                        hasMoreData = false; // 没有更多数据了，结束循环
                    }
                } else {
                    console.error(
                        "Error fetching order history:",
                        filledOrders
                    );
                    break;
                }
                await sleep(100);
            }
            return totalTradingAmt;
        } catch (e) {
            console.error("getTradingAmount", e);
            return 0;
        }
    }

    async getPositionMode() {
        const accountArr = await this.client.getAccountConfiguration();
        if (accountArr && accountArr.length > 0) {
            const account = accountArr[0];
            return account.posMode;
        }
        return "Unknown";
    }

    async setPositionMode(posMode) {
        return await this.client.setPositionMode(posMode);
    }

    async getAssetMargin() {
        const accountArr = await this.client.getAccountConfiguration();
        if (accountArr && accountArr.length > 0) {
            const account = accountArr[0];
            if (account.acctLv == 1) {
                return "Simple mode";
            } else if (account.acctLv == 2) {
                return "Single-currency margin mode";
            } else if (account.acctLv == 3) {
                return "Multi-currency margin code";
            } else if (account.acctLv == 4) {
                return "Portfolio margin mode";
            } else {
                return "Unknown";
            }
        }
        return "Unknown";
    }

    async setAssetMargin(acctLv) {
        return await this.client.setAssetMargin(acctLv);
    }

    async trasferAsset(fromAccount, toAccount, asset, amount) {
        let from = "";
        if (fromAccount == "Funding") {
            from = "6";
        } else if (fromAccount == "Trading") {
            from = "18";
        }

        let to = "";
        if (toAccount == "Funding") {
            to = "6";
        } else if (toAccount == "Trading") {
            to = "18";
        }

        if (from == "" || to == "" || from == to) {
            return;
        }

        return await this.client.fundsTransfer({
            from,
            to,
            ccy: asset,
            amt: amount,
        });
    }

    async trasferAssetFromSubAccountToMainAccount(subAccount, asset, amount) {
        return await this.client.fundsTransfer({
            type: 2, // 用母账户APIKEY 将子账户的资金划转到母账户
            subAcct: subAccount,
            from: 6, // 资金账户
            to: 6, // 资金账户
            ccy: asset,
            amt: amount,
        });
    }

    async getSubAccountBalances(subAccount) {
        return await this.client.getSubAccountBalances(subAccount);
    }

    async setSubAccountTransferOutPermission(subAccount, canTransOut = true) {
        return await this.client.setSubAccountTransferOutPermission(
            subAccount,
            canTransOut
        );
    }

    // // --------------------------- websocket ---------------------------
    wsFuturesAccount() {
        this.wsClient.subscribe([
            {
                channel: "positions",
                instType: "SWAP",
            },
            {
                channel: "orders",
                instType: "SWAP",
            },
        ]);
    }

    wsFuturesPositions() {
        this.wsClient.subscribe([
            {
                channel: "positions",
                instType: "SWAP",
                extraParams: JSON.stringify({ updateInterval: "2000" }),
            },
        ]);
    }

    wsFuturesOrders() {
        this.wsClient.subscribe([
            {
                channel: "orders",
                instType: "SWAP",
            },
        ]);
    }

    wsFuturesDelta() {
        this.wsClient.subscribe([
            {
                channel: "positions",
                instType: "SWAP",
                extraParams: '{"updateInterval": "2000"}',
            },
            {
                channel: "orders",
                instType: "SWAP",
            },
            {
                channel: "account",
                extraParams: JSON.stringify({ updateInterval: "1000" }),
            },
        ]);
    }

    // 订阅bookticker消息
    async wsFuturesBookTicker(symbols) {
        const allSymbols = symbols.map((symbol) => {
            return {
                channel: "tickers",
                instId: symbol,
            };
        });
        const batchSize = 10;
        while (allSymbols.length > 0) {
            const params = allSymbols.splice(0, batchSize);
            this.wsClient.subscribe(params);
            await sleep(200);
        }
    }
}
module.exports = OkxClient;
