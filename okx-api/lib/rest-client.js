"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestClient = void 0;
const requestUtils_1 = require("./util/requestUtils");
const BaseRestClient_1 = __importDefault(require("./util/BaseRestClient"));
class RestClient extends BaseRestClient_1.default {
    /**
     * @public Creates an instance of the REST API client.
     */
    constructor(credentials, environment = 'prod', restClientOptions = {}, requestOptions = {}) {
        super(credentials, (0, requestUtils_1.getRestBaseUrl)(environment, restClientOptions), restClientOptions, requestOptions, environment);
        return this;
    }
    getServerTime() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.get('/api/v5/public/time');
            const timestamp = Array.isArray(response) ? Number((_a = response[0]) === null || _a === void 0 ? void 0 : _a.ts) : NaN;
            if (!Array.isArray(response) ||
                isNaN(timestamp) ||
                typeof timestamp !== 'number') {
                throw response;
            }
            return timestamp;
        });
    }
    /**
     *
     * Trade endpoints (private)
     *
     */
    submitOrder(params) {
        return this.postPrivate('/api/v5/trade/order', params);
    }
    submitMultipleOrders(params) {
        return this.postPrivate('/api/v5/trade/batch-orders', params);
    }
    cancelOrder(params) {
        return this.postPrivate('/api/v5/trade/cancel-order', params);
    }
    cancelMultipleOrders(params) {
        return this.postPrivate('/api/v5/trade/cancel-batch-orders', params);
    }
    amendOrder(params) {
        return this.postPrivate('/api/v5/trade/amend-order', params);
    }
    amendMultipleOrders(params) {
        return this.postPrivate('/api/v5/trade/amend-batch-orders', params);
    }
    closePositions(params) {
        return this.postPrivate('/api/v5/trade/close-position', params);
    }
    getOrderDetails(params) {
        return this.getPrivate('/api/v5/trade/order', params);
    }
    getOrderList(params) {
        return this.getPrivate('/api/v5/trade/orders-pending', params);
    }
    /**
     * Get history for last 7 days
     */
    getOrderHistory(params) {
        return this.getPrivate('/api/v5/trade/orders-history', params);
    }
    /**
     * Get history for last 3 months
     */
    getOrderHistoryArchive(params) {
        return this.getPrivate('/api/v5/trade/orders-history-archive', params);
    }
    /**
     * Get history for last 7 days
     */
    getFills(params) {
        return this.getPrivate('/api/v5/trade/fills', params);
    }
    /**
     * Get history for last 3 months
     */
    getFillsHistory(params) {
        return this.getPrivate('/api/v5/trade/fills-history', params);
    }
    placeAlgoOrder(params) {
        return this.postPrivate('/api/v5/trade/order-algo', params);
    }
    getAlgoOrderDetails(params) {
        return this.getPrivate('/api/v5/trade/order-algo', params);
    }
    amendAlgoOrder(params) {
        return this.postPrivate('/api/v5/trade/amend-algos', params);
    }
    cancelAlgoOrder(params) {
        return this.postPrivate('/api/v5/trade/cancel-algos', params);
    }
    cancelAdvanceAlgoOrder(params) {
        return this.postPrivate('/api/v5/trade/cancel-advance-algos', params);
    }
    getAlgoOrderList(params) {
        return this.getPrivate('/api/v5/trade/orders-algo-pending', params);
    }
    getAlgoOrderHistory(params) {
        return this.getPrivate('/api/v5/trade/orders-algo-history', params);
    }
    /** Get easy convert currency list */
    getEasyConvertCurrencies() {
        return this.getPrivate('/api/v5/trade/easy-convert-currency-list');
    }
    /**
     * Place easy convert : Convert small currencies to mainstream currencies.
     * Only applicable to the crypto balance less than $10.
     *
     * Maximum 5 currencies can be selected in one order.
     * If there are multiple currencies, separate them with commas in the "from" field.
     */
    submitEasyConvert(fromCcys, toCcy) {
        return this.postPrivate('/api/v5/trade/easy-convert', {
            fromCcy: fromCcys,
            toCcy,
        });
    }
    /** Get easy convert history : Get the history and status of easy convert trades. */
    getEasyConvertHistory(params) {
        return this.getPrivate('/api/v5/trade/easy-convert-history', params);
    }
    /**
     * Get one-click repay currency list : Get list of debt currency data and repay currencies.
     * Debt currencies include both cross and isolated debts.
     */
    getOneClickRepayCurrencyList(debtType) {
        return this.getPrivate('/api/v5/trade/one-click-repay-currency-list', {
            debtType,
        });
    }
    /**
     * Trade one-click repay to repay cross debts.
     * Isolated debts are not applicable.
     * The maximum repayment amount is based on the remaining available balance of funding and trading accounts.
     */
    submitOneClickRepay(debtCcys, repayCcy) {
        return this.postPrivate('/api/v5/trade/one-click-repay', {
            debtCcy: debtCcys.join(','),
            repayCcy,
        });
    }
    /** Get the history and status of one-click repay trades. */
    getOneClickRepayHistory(params) {
        return this.getPrivate('/api/v5/trade/one-click-repay-history', params);
    }
    /**
     *
     * Block trading endpoints (private)
     *
     */
    getBlockCounterParties() {
        return this.getPrivate('/api/v5/rfq/counterparties');
    }
    createBlockRFQ(params) {
        return this.postPrivate('/api/v5/rfq/create-rfq', params);
    }
    cancelBlockRFQ(params) {
        return this.postPrivate('/api/v5/rfq/cancel-rfq', params);
    }
    cancelMultipleBlockRFQs(params) {
        return this.postPrivate('/api/v5/rfq/cancel-batch-rfqs', params);
    }
    cancelAllRFQs() {
        return this.postPrivate('/api/v5/rfq/cancel-all-rfqs');
    }
    executeBlockQuote(params) {
        return this.postPrivate('/api/v5/rfq/execute-quote', params);
    }
    createBlockQuote(params) {
        return this.postPrivate('/api/v5/rfq/create-quote', params);
    }
    cancelBlockQuote(params) {
        return this.postPrivate('/api/v5/rfq/cancel-quote', params);
    }
    cancelMultipleBlockQuotes(params) {
        return this.postPrivate('/api/v5/rfq/cancel-batch-quotes', params);
    }
    cancelAllBlockQuotes() {
        return this.postPrivate('/api/v5/rfq/cancel-all-quotes');
    }
    getBlockRFQs(params) {
        return this.getPrivate('/api/v5/rfq/rfqs', params);
    }
    getBlockQuotes(params) {
        return this.getPrivate('/api/v5/rfq/quotes', params);
    }
    getBlockTrades(params) {
        return this.getPrivate('/api/v5/rfq/trades', params);
    }
    getPublicRFQBlockTrades(params) {
        return this.get('/api/v5/rfq/public-trades', params);
    }
    /**
     *
     * Funding endpoints (private)
     *
     */
    getCurrencies(ccy) {
        return this.getPrivate('/api/v5/asset/currencies', { ccy });
    }
    getBalances(ccy) {
        return this.getPrivate('/api/v5/asset/balances', { ccy });
    }
    getAccountAssetValuation(ccy) {
        return this.getPrivate('/api/v5/asset/asset-valuation', { ccy });
    }
    fundsTransfer(params) {
        return this.postPrivate('/api/v5/asset/transfer', params);
    }
    /** Either parameter transId or clientId is required. */
    getFundsTransferState(params) {
        return this.getPrivate('/api/v5/asset/transfer-state', params);
    }
    getAssetBillsDetails(params) {
        return this.getPrivate('/api/v5/asset/bills', params);
    }
    getLightningDeposits(ccy, amt, to) {
        return this.getPrivate('/api/v5/asset/deposit-lightning', { ccy, amt, to });
    }
    getDepositAddress(ccy) {
        return this.getPrivate('/api/v5/asset/deposit-address', { ccy });
    }
    getDepositHistory(params) {
        return this.getPrivate('/api/v5/asset/deposit-history', params);
    }
    submitWithdraw(params) {
        return this.postPrivate('/api/v5/asset/withdrawal', params);
    }
    submitWithdrawLightning(ccy, invoice, memo) {
        return this.postPrivate('/api/v5/asset/withdrawal-lightning', {
            ccy,
            invoice,
            memo,
        });
    }
    cancelWithdrawal(wdId) {
        return this.postPrivate('/api/v5/asset/cancel-withdrawal', { wdId });
    }
    getWithdrawalHistory(params) {
        return this.getPrivate('/api/v5/asset/withdrawal-history', params);
    }
    smallAssetsConvert(ccy) {
        return this.getPrivate('/api/v5/asset/convert-dust-assets', { ccy });
    }
    getSavingBalance(ccy) {
        return this.getPrivate('/api/v5/finance/savings/balance', { ccy });
    }
    savingsPurchaseRedemption(ccy, amt, side, rate) {
        return this.postPrivate('/api/v5/finance/savings/purchase-redempt', {
            ccy,
            amt,
            side,
            rate,
        });
    }
    setLendingRate(ccy, rate) {
        return this.postPrivate('/api/v5/finance/savings/set-lending-rate', {
            ccy,
            rate,
        });
    }
    getLendingHistory(params) {
        return this.getPrivate('/api/v5/finance/savings/lending-history', params);
    }
    getPublicBorrowInfo(ccy) {
        return this.get('/api/v5/finance/savings/lending-rate-summary', { ccy });
    }
    getPublicBorrowHistory(params) {
        return this.get('/api/v5/finance/savings/lending-rate-history', params);
    }
    /**
     *
     * Convert endpoints (private)
     *
     */
    getConvertCurrencies() {
        return this.getPrivate('/api/v5/asset/convert/currencies');
    }
    getConvertCurrencyPair(fromCcy, toCcy) {
        return this.getPrivate('/api/v5/asset/convert/currency-pair', {
            fromCcy,
            toCcy,
        });
    }
    estimateConvertQuote(params) {
        return this.postPrivate('/api/v5/asset/convert/estimate-quote', params);
    }
    convertTrade(params) {
        return this.postPrivate('/api/v5/asset/convert/trade', params);
    }
    getConvertHistory(params) {
        return this.getPrivate('/api/v5/asset/convert/history', params);
    }
    /**
     *
     * Account endpoints (private)
     *
     */
    getBalance(ccy) {
        return this.getPrivate('/api/v5/account/balance', { ccy });
    }
    getPositions(params) {
        return this.getPrivate('/api/v5/account/positions', params);
    }
    getPositionsHistory(params) {
        return this.getPrivate('/api/v5/account/positions-history', params);
    }
    getAccountPositionRisk(instType) {
        return this.getPrivate('/api/v5/account/account-position-risk', {
            instType,
        });
    }
    /** Up to last 7 days */
    getBills(params) {
        return this.getPrivate('/api/v5/account/bills', params);
    }
    /** Last 3 months */
    getBillsArchive(params) {
        return this.getPrivate('/api/v5/account/bills-archive', params);
    }
    getAccountConfiguration() {
        return this.getPrivate('/api/v5/account/config');
    }
    setPositionMode(posMode) {
        return this.postPrivate('/api/v5/account/set-position-mode', { posMode });
    }
    setLeverage(params) {
        return this.postPrivate('/api/v5/account/set-leverage', params);
    }
    /** Max buy/sell amount or open amount */
    getMaxBuySellAmount(params) {
        return this.getPrivate('/api/v5/account/max-size', params);
    }
    getMaxAvailableTradableAmount(params) {
        return this.getPrivate('/api/v5/account/max-avail-size', params);
    }
    changePositionMargin(params) {
        return this.postPrivate('/api/v5/account/position/margin-balance', params);
    }
    getLeverage(instId, mgnMode) {
        return this.getPrivate('/api/v5/account/leverage-info', {
            instId,
            mgnMode,
        });
    }
    getLeverageEstimatedInfo(params) {
        return this.getPrivate('/api/v5/account/adjust-leverage-info', params);
    }
    getMaxLoan(instId, mgnMode, mgnCcy) {
        return this.getPrivate('/api/v5/account/max-loan', {
            instId,
            mgnMode,
            mgnCcy,
        });
    }
    getFeeRates(instType, instId, uly) {
        return this.getPrivate('/api/v5/account/trade-fee', {
            instType,
            instId,
            uly,
        });
    }
    getInterestAccrued(params) {
        return this.getPrivate('/api/v5/account/interest-accrued', params);
    }
    getInterestRate(ccy) {
        return this.getPrivate('/api/v5/account/interest-rate', { ccy });
    }
    setGreeksDisplayType(greeksType) {
        return this.postPrivate('/api/v5/account/set-greeks', { greeksType });
    }
    setIsolatedMode(isoMode, type) {
        return this.postPrivate('/api/v5/account/set-isolated-mode', {
            isoMode,
            type,
        });
    }
    getMaxWithdrawals(ccy) {
        return this.getPrivate('/api/v5/account/max-withdrawal', { ccy });
    }
    getAccountRiskState() {
        return this.getPrivate('/api/v5/account/risk-state');
    }
    borrowRepayVIPLoan(ccy, side, amt, ordId) {
        return this.postPrivate('/api/v5/account/borrow-repay', {
            ccy,
            side,
            amt,
            ordId,
        });
    }
    getVIPLoanBorrowRepayHistory(params) {
        return this.getPrivate('/api/v5/account/borrow-repay-history', params);
    }
    getBorrowInterestLimits(params) {
        return this.getPrivate('/api/v5/account/interest-limits', params);
    }
    positionBuilder(params) {
        return this.postPrivate('/api/v5/account/simulated_margin', params);
    }
    getGreeks(ccy) {
        return this.getPrivate('/api/v5/account/greeks', { ccy });
    }
    getPMLimitation(params) {
        return this.getPrivate('/api/v5/account/position-tiers', params);
    }
    /**
     *
     * SubAccount endpoints (private)
     *
     */
    /** View sub-account list */
    getSubAccountList(params) {
        return this.getPrivate('/api/v5/users/subaccount/list', params);
    }
    /** Reset the APIKey of a sub-account */
    resetSubAccountAPIKey(subAcct, apiKey, options) {
        return this.postPrivate('/api/v5/users/subaccount/modify-apikey', Object.assign({ subAcct,
            apiKey }, options));
    }
    /** Get sub-account trading balance */
    getSubAccountBalances(subAcct) {
        return this.getPrivate('/api/v5/account/subaccount/balances', { subAcct });
    }
    /** Get sub-account funding balance */
    getSubAccountFundingBalances(subAcct, ccy) {
        return this.getPrivate('/api/v5/asset/subaccount/balances', {
            subAcct,
            ccy,
        });
    }
    /** History of sub-account transfer */
    getSubAccountTransferHistory(params) {
        return this.getPrivate('/api/v5/asset/subaccount/bills', params);
    }
    /** Master accounts manage the transfers between sub-accounts */
    transferSubAccountBalance(params) {
        return this.postPrivate('/api/v5/asset/subaccount/transfer', params);
    }
    /** Set Permission Of Transfer Out */
    setSubAccountTransferOutPermission(subAcct, canTransOut = true) {
        return this.postPrivate('/api/v5/users/subaccount/set-transfer-out', {
            subAcct,
            canTransOut,
        });
    }
    /** Get custody trading sub-account list */
    getSubAccountCustodyTradingList(subAcct) {
        return this.getPrivate('/api/v5/users/entrust-subaccount-list', {
            subAcct,
        });
    }
    /**
     *
     * Grid trading endpoints (private)
     *
     */
    placeGridAlgoOrder(params) {
        return this.postPrivate('/api/v5/tradingBot/grid/order-algo', params);
    }
    amendGridAlgoOrder(algoId, instId, triggerPx) {
        return this.postPrivate('/api/v5/tradingBot/grid/amend-order-algo', Object.assign({ algoId,
            instId }, triggerPx));
    }
    stopGridAlgoOrder(orders) {
        return this.postPrivate('/api/v5/tradingBot/grid/stop-order-algo', orders);
    }
    getGridAlgoOrderList(params) {
        return this.getPrivate('/api/v5/tradingBot/grid/orders-algo-pending', params);
    }
    getGridAlgoOrderHistory(params) {
        return this.getPrivate('/api/v5/tradingBot/grid/orders-algo-history', params);
    }
    getGridAlgoOrderDetails(algoOrdType, algoId) {
        return this.getPrivate('/api/v5/tradingBot/grid/orders-algo-details', {
            algoOrdType,
            algoId,
        });
    }
    getGridAlgoSubOrders(algoOrdType, algoId, type, groupId, pagination) {
        return this.getPrivate('/api/v5/tradingBot/grid/sub-orders', Object.assign({ algoOrdType,
            algoId,
            type,
            groupId }, pagination));
    }
    /** Only contract grid supports this method */
    getGridAlgoOrderPositions(algoOrdType, algoId) {
        return this.getPrivate('/api/v5/tradingBot/grid/positions', {
            algoOrdType,
            algoId,
        });
    }
    spotGridWithdrawIncome(algoId) {
        return this.postPrivate('/api/v5/tradingBot/grid/withdraw-income', {
            algoId,
        });
    }
    computeGridMarginBalance(algoId, type, amt) {
        return this.postPrivate('/api/v5/tradingBot/grid/compute-margin-balance', {
            algoId,
            type,
            amt,
        });
    }
    adjustGridMarginBalance(algoId, type, change) {
        return this.postPrivate('/api/v5/tradingBot/grid/margin-balance', Object.assign({ algoId,
            type }, change));
    }
    getGridAIParameter(algoOrdType, instId, direction, duration) {
        return this.get('/api/v5/tradingBot/grid/ai-param', {
            algoOrdType,
            instId,
            direction,
            duration,
        });
    }
    /**
     *
     * Earn/staking endpoints (private)
     *
     */
    /** Get earn offers */
    getStakingOffers(params) {
        return this.getPrivate('/api/v5/finance/staking-defi/offers', params);
    }
    /** Earn/staking purchase */
    submitStake(productId, investData, term) {
        return this.postPrivate('/api/v5/finance/staking-defi/purchase', {
            productId,
            investData,
            term,
        });
    }
    /** Earn/staking redeem */
    redeemStake(ordId, protocolType, allowEarlyRedeem) {
        return this.postPrivate('/api/v5/finance/staking-defi/redeem', {
            ordId,
            protocolType,
            allowEarlyRedeem,
        });
    }
    /** Earn/staking cancel purchases/redemptions */
    cancelStakingRequest(ordId, protocolType) {
        return this.postPrivate('/api/v5/finance/staking-defi/cancel', {
            ordId,
            protocolType,
        });
    }
    /** Earn/staking get active orders */
    getActiveStakingOrders(params) {
        return this.getPrivate('/api/v5/finance/staking-defi/orders-active', params);
    }
    /** Earn/staking get order history */
    getStakingOrderHistory(params) {
        return this.getPrivate('/api/v5/finance/staking-defi/orders-history', params);
    }
    /**
     *
     * Market data endpoints (public)
     *
     */
    getTickers(instrumentType, uly) {
        return this.get('/api/v5/market/tickers', {
            instType: instrumentType,
            uly,
        });
    }
    getTicker(instId) {
        return this.get('/api/v5/market/ticker', {
            instId,
        });
    }
    getIndexTickers(params) {
        return this.get('/api/v5/market/index-tickers', Object.assign({}, params));
    }
    getOrderBook(instId, sz) {
        return this.get('/api/v5/market/books', { instId, sz });
    }
    getCandles(instId, bar = '1m', pagination) {
        return this.get('/api/v5/market/candles', Object.assign({ instId,
            bar }, pagination));
    }
    getHistoricCandles(instId, bar = '1m', pagination) {
        return this.get('/api/v5/market/history-candles', Object.assign({ instId,
            bar }, pagination));
    }
    getIndexCandles(instId, bar = '1m', pagination) {
        return this.get('/api/v5/market/index-candles', Object.assign({ instId,
            bar }, pagination));
    }
    getHistoricIndexCandles(instId, bar = '1m', pagination) {
        return this.get('/api/v5/market/history-index-candles', Object.assign({ instId,
            bar }, pagination));
    }
    getMarkPriceCandles(instId, bar = '1m', pagination) {
        return this.get('/api/v5/market/mark-price-candles', Object.assign({ instId,
            bar }, pagination));
    }
    getHistoricMarkPriceCandles(instId, bar = '1m', pagination) {
        return this.get('/api/v5/market/historic-mark-price-candles', Object.assign({ instId,
            bar }, pagination));
    }
    getTrades(instId, limit) {
        return this.get('/api/v5/market/trades', { instId, limit });
    }
    getHistoricTrades(instId, pagination) {
        return this.get('/api/v5/market/history-trades', Object.assign({ instId }, pagination));
    }
    get24hrTotalVolume() {
        return this.get('/api/v5/market/platform-24-volume');
    }
    getOracle() {
        return this.get('/api/v5/market/open-oracle');
    }
    getExchangeRate() {
        return this.get('/api/v5/market/exchange-rate');
    }
    getIndexComponents(index) {
        return this.get('/api/v5/market/index-components', { index });
    }
    getBlockTickers(instType, uly) {
        return this.get('/api/v5/market/block-tickers', { instType, uly });
    }
    getBlockTicker(instId) {
        return this.get('/api/v5/market/block-ticker', { instId });
    }
    getPublicBlockTrades(instId) {
        return this.get('/api/v5/market/block-trades', { instId });
    }
    /**
     *
     * Public data endpoints (public)
     *
     */
    getInstruments(instType, uly, instFamily, instId) {
        return this.get('/api/v5/public/instruments', {
            instType,
            uly,
            instFamily,
            instId,
        });
    }
    getDeliveryExerciseHistory(params) {
        return this.get('/api/v5/public/delivery-exercise-history', params);
    }
    getOpenInterest(params) {
        return this.get('/api/v5/public/open-interest', params);
    }
    getFundingRate(params) {
        return this.get('/api/v5/public/funding-rate', params);
    }
    getFundingRateHistory(params) {
        return this.get('/api/v5/public/funding-rate-history', params);
    }
    getMinMaxLimitPrice(params) {
        return this.get('/api/v5/public/price-limit', params);
    }
    getOptionMarketData(params) {
        return this.get('/api/v5/public/opt-summary', params);
    }
    getEstimatedDeliveryExercisePrice(params) {
        return this.get('/api/v5/public/estimated-price', params);
    }
    getDiscountRateAndInterestFreeQuota(params) {
        return this.get('/api/v5/public/discount-rate-interest-free-quota', params);
    }
    getSystemTime(params) {
        return this.get('/api/v5/public/time', params);
    }
    getLiquidationOrders(params) {
        return this.get('/api/v5/public/liquidation-orders', params);
    }
    getMarkPrice(params) {
        return this.get('/api/v5/public/mark-price', params);
    }
    getPositionTiers(params) {
        return this.get('/api/v5/public/position-tiers', params);
    }
    getInterestRateAndLoanQuota(params) {
        return this.get('/api/v5/public/interest-rate-loan-quota', params);
    }
    getVIPInterestRateAndLoanQuota(params) {
        return this.get('/api/v5/public/vip-interest-rate-loan-quota', params);
    }
    getUnderlying(params) {
        return this.get('/api/v5/public/underlying', params);
    }
    getInsuranceFund(params) {
        return this.get('/api/v5/public/insurance-fund', params);
    }
    getUnitConvert(params) {
        return this.get('/api/v5/public/convert-contract-coin', params);
    }
    getEconomicCalendar(params) {
        return this.getPrivate('/api/v5/public/economic-calendar', params);
    }
    /**
     *
     * Trading data endpoints (public)
     *
     */
    getSupportCoin() {
        return this.get('/api/v5/rubik/stat/trading-data/support-coin');
    }
    getTakerVolume() {
        return this.get('/api/v5/rubik/stat/taker-volume');
    }
    getMarginLendingRatio(params) {
        return this.get('/api/v5/rubik/stat/margin/loan-ratio', params);
    }
    getLongShortRatio(params) {
        return this.get('/api/v5/rubik/stat/contracts/long-short-account-ratio', params);
    }
    getContractsOpenInterestAndVolume(params) {
        return this.get('/api/v5/rubik/stat/contracts/open-interest-volume', params);
    }
    getOptionsOpenInterestAndVolume(params) {
        return this.get('/api/v5/rubik/stat/option/open-interest-volume', params);
    }
    getPutCallRatio(params) {
        return this.get('/api/v5/rubik/stat/option/open-interest-volume-ratio', params);
    }
    getOpenInterestAndVolumeExpiry(params) {
        return this.get('/api/v5/rubik/stat/option/open-interest-volume-expiry', params);
    }
    getOpenInterestAndVolumeStrike(params) {
        return this.get('/api/v5/rubik/stat/option/open-interest-volume-strike', params);
    }
    getTakerFlow(params) {
        return this.get('/api/v5/rubik/stat/option/taker-block-volume', params);
    }
    /**
     *
     * Status endpoints (public)
     *
     */
    getSystemStatus(state) {
        return this.get('/api/v5/system/status', { state });
    }
    /**
     *
     * Broker endpoints (private)
     *
     */
    // TODO: add missing broker endpoints
    getBrokerAccountInformation() {
        return this.getPrivate('/api/v5/broker/nd/info');
    }
    createSubAccount(params) {
        return this.postPrivate('/api/v5/broker/nd/create-subaccount', params);
    }
    deleteSubAccount(params) {
        return this.postPrivate('/api/v5/broker/nd/delete-subaccount', params);
    }
    createSubAccountAPIKey(params) {
        return this.postPrivate('/api/v5/broker/nd/subaccount/apikey', params);
    }
}
exports.RestClient = RestClient;
//# sourceMappingURL=rest-client.js.map