import { AxiosRequestConfig } from 'axios';
import BaseRestClient from './util/BaseRestClient';
import { ContractGridDirection, GridAlgoOrderType, GridAlgoSubOrderType, InstrumentType, MarginMode, numberInString, Ticker, AmendOrderRequest, CancelAlgoOrderRequest, OrderIdRequest, ClosePositionRequest, OrderRequest, OrderHistoryRequest, FillsHistoryRequest, AlgoRecentHistoryRequest, AlgoLongHistoryRequest, PaginatedSymbolRequest, OrderResult, CancelledOrderResult, AmendedOrder, ClosedPositions, OrderDetails, OrderListItem, HistoricOrder, OrderFill, AlgoOrderResult, AlgoOrderListItem, HistoricAlgoOrder, BlockCounterParty, CreateBlockRFQRequest, CreateRFQResult, CancelBlockRFQRequest, CancelBlockQuoteResult, CancelMultipleBlockRFQRequest, TimestampObject, ExecuteBlockQuoteResult, ExecuteBlockQuoteRequest, CreateBlockQuoteRequest, CreateBlockQuoteResult, CancelBlockRFQResult, CancelBlockQuoteRequest, CancelMultipleBlockQuoteRequest, BlockRFQResult, GetBlockRFQSParams, GetBlockQuoteParams, GetBlockQuoteResult, FundingCurrency, FundingBalance, AccountAssetValuation, FundTransferResult, FundTransferState, AssetBillDetails, AccountBalance, GetPositionsParams, AccountPosition, GetHistoricPositionParams, HistoricAccountPosition, AccountPositionRisk, AccountBill, AccountConfiguration, AccountPositionModeResult, AccountLeverageResult, AccountMaxOrderAmount, AccountMaxTradableAmount, AccountChangeMarginResult, AccountLeverage, AccountMaxLoan, AccountFeeRate, AccountIsolatedMode, SubAccount, SubAccountAPIReset, SubAccountBalances, SubAccountTransferResult, IndexTicker, OrderBook, Candle, CandleNoVolume, Trade, Pagination, APIResponse, GetGridAlgoOrdersRequest, FundsTransferRequest, WithdrawRequest, WithdrawResponse, ConvertTradeRequest, ConvertQuoteEstimateRequest, SetLeverageRequest, ChangePositionMarginRequest, SubAccountTransferRequest, GridAlgoOrderRequest, StopGridAlgoOrderRequest, APICredentials, RestClientOptions, APIMarket, Instrument, PosMode, AlgoOrderDetailsRequest, AlgoOrderDetailsResult, AmendAlgoOrderRequest, AmendAlgoOrderResult, AlgoOrderRequest, EconomicCalendarData, UnitConvertData, EconomicCalendarRequest, UnitConvertRequest, PositionSide, AdjustLeverageInfo, InterestAccrued, InterestRate, Greeks, AccountRiskState, SystemTime, MaxWithdrawal, WithdrawalHistoryRequest, FundingRateRequest } from './types';
import { ASSET_BILL_TYPE } from './constants';
export declare class RestClient extends BaseRestClient {
    /**
     * @public Creates an instance of the REST API client.
     */
    constructor(credentials?: APICredentials | null, environment?: APIMarket, restClientOptions?: RestClientOptions, requestOptions?: AxiosRequestConfig);
    getServerTime(): Promise<number>;
    /**
     *
     * Trade endpoints (private)
     *
     */
    submitOrder(params: OrderRequest): Promise<OrderResult[]>;
    submitMultipleOrders(params: OrderRequest[]): Promise<OrderResult[]>;
    cancelOrder(params: OrderIdRequest): Promise<CancelledOrderResult[]>;
    cancelMultipleOrders(params: OrderIdRequest[]): Promise<CancelledOrderResult[]>;
    amendOrder(params: AmendOrderRequest): Promise<AmendedOrder[]>;
    amendMultipleOrders(params: AmendOrderRequest[]): Promise<AmendedOrder[]>;
    closePositions(params: ClosePositionRequest): Promise<ClosedPositions[]>;
    getOrderDetails(params: OrderIdRequest): Promise<OrderDetails[]>;
    getOrderList(params?: OrderHistoryRequest): Promise<OrderListItem[]>;
    /**
     * Get history for last 7 days
     */
    getOrderHistory(params: OrderHistoryRequest): Promise<HistoricOrder[]>;
    /**
     * Get history for last 3 months
     */
    getOrderHistoryArchive(params: OrderHistoryRequest): Promise<HistoricOrder[]>;
    /**
     * Get history for last 7 days
     */
    getFills(params?: FillsHistoryRequest): Promise<OrderFill[]>;
    /**
     * Get history for last 3 months
     */
    getFillsHistory(params: FillsHistoryRequest): Promise<OrderFill[]>;
    placeAlgoOrder(params: AlgoOrderRequest): Promise<AlgoOrderResult[]>;
    getAlgoOrderDetails(params: AlgoOrderDetailsRequest): Promise<AlgoOrderDetailsResult[]>;
    amendAlgoOrder(params: AmendAlgoOrderRequest): Promise<AmendAlgoOrderResult[]>;
    cancelAlgoOrder(params: CancelAlgoOrderRequest[]): Promise<AlgoOrderResult[]>;
    cancelAdvanceAlgoOrder(params: CancelAlgoOrderRequest[]): Promise<AlgoOrderResult[]>;
    getAlgoOrderList(params: AlgoRecentHistoryRequest): Promise<AlgoOrderListItem[]>;
    getAlgoOrderHistory(params: AlgoLongHistoryRequest): Promise<HistoricAlgoOrder[]>;
    /** Get easy convert currency list */
    getEasyConvertCurrencies(): Promise<any>;
    /**
     * Place easy convert : Convert small currencies to mainstream currencies.
     * Only applicable to the crypto balance less than $10.
     *
     * Maximum 5 currencies can be selected in one order.
     * If there are multiple currencies, separate them with commas in the "from" field.
     */
    submitEasyConvert(fromCcys: string[], toCcy: string): Promise<APIResponse<any>>;
    /** Get easy convert history : Get the history and status of easy convert trades. */
    getEasyConvertHistory(params?: Pagination): Promise<APIResponse<any>>;
    /**
     * Get one-click repay currency list : Get list of debt currency data and repay currencies.
     * Debt currencies include both cross and isolated debts.
     */
    getOneClickRepayCurrencyList(debtType?: 'cross' | 'isolated'): Promise<APIResponse<any>>;
    /**
     * Trade one-click repay to repay cross debts.
     * Isolated debts are not applicable.
     * The maximum repayment amount is based on the remaining available balance of funding and trading accounts.
     */
    submitOneClickRepay(debtCcys: string[], repayCcy: string): Promise<APIResponse<any>>;
    /** Get the history and status of one-click repay trades. */
    getOneClickRepayHistory(params?: Pagination): Promise<APIResponse<any>>;
    /**
     *
     * Block trading endpoints (private)
     *
     */
    getBlockCounterParties(): Promise<BlockCounterParty[]>;
    createBlockRFQ(params: CreateBlockRFQRequest): Promise<CreateRFQResult[]>;
    cancelBlockRFQ(params: CancelBlockRFQRequest): Promise<CancelBlockRFQResult[]>;
    cancelMultipleBlockRFQs(params: CancelMultipleBlockRFQRequest): Promise<CancelBlockRFQResult[]>;
    cancelAllRFQs(): Promise<TimestampObject[]>;
    executeBlockQuote(params: ExecuteBlockQuoteRequest): Promise<ExecuteBlockQuoteResult[]>;
    createBlockQuote(params: CreateBlockQuoteRequest): Promise<CreateBlockQuoteResult[]>;
    cancelBlockQuote(params: CancelBlockQuoteRequest): Promise<CancelBlockQuoteResult[]>;
    cancelMultipleBlockQuotes(params: CancelMultipleBlockQuoteRequest): Promise<CancelBlockQuoteResult[]>;
    cancelAllBlockQuotes(): Promise<TimestampObject[]>;
    getBlockRFQs(params?: GetBlockRFQSParams): Promise<BlockRFQResult[]>;
    getBlockQuotes(params?: GetBlockQuoteParams): Promise<GetBlockQuoteResult[]>;
    getBlockTrades(params?: any): Promise<any[]>;
    getPublicRFQBlockTrades(params?: any): Promise<any[]>;
    /**
     *
     * Funding endpoints (private)
     *
     */
    getCurrencies(ccy?: string): Promise<FundingCurrency[]>;
    getBalances(ccy?: string): Promise<FundingBalance[]>;
    getAccountAssetValuation(ccy?: string): Promise<AccountAssetValuation[]>;
    fundsTransfer(params: FundsTransferRequest): Promise<FundTransferResult[]>;
    /** Either parameter transId or clientId is required. */
    getFundsTransferState(params: {
        transId?: string;
        clientId?: string;
        type?: '0' | '1' | '2';
    }): Promise<FundTransferState[]>;
    getAssetBillsDetails(params?: {
        ccy?: string;
        type?: `${ASSET_BILL_TYPE}`;
        clientId?: string;
        after?: numberInString;
        before?: numberInString;
        limit?: numberInString;
    }): Promise<AssetBillDetails[]>;
    getLightningDeposits(ccy: string, amt: numberInString, to?: '6' | '18'): Promise<any[]>;
    getDepositAddress(ccy: string): Promise<any[]>;
    getDepositHistory(params?: any): Promise<any[]>;
    submitWithdraw(params: WithdrawRequest): Promise<WithdrawResponse[]>;
    submitWithdrawLightning(ccy: string, invoice: string, memo?: string): Promise<any[]>;
    cancelWithdrawal(wdId: string): Promise<any[]>;
    getWithdrawalHistory(params?: WithdrawalHistoryRequest): Promise<any[]>;
    smallAssetsConvert(ccy: string[]): Promise<any[]>;
    getSavingBalance(ccy?: string): Promise<any[]>;
    savingsPurchaseRedemption(ccy: string, amt: numberInString, side: 'purchase' | 'redempt', rate: numberInString): Promise<any[]>;
    setLendingRate(ccy: string, rate: numberInString): Promise<any[]>;
    getLendingHistory(params?: PaginatedSymbolRequest): Promise<any[]>;
    getPublicBorrowInfo(ccy?: string): Promise<any[]>;
    getPublicBorrowHistory(params?: PaginatedSymbolRequest): Promise<any[]>;
    /**
     *
     * Convert endpoints (private)
     *
     */
    getConvertCurrencies(): Promise<any[]>;
    getConvertCurrencyPair(fromCcy: string, toCcy: string): Promise<any[]>;
    estimateConvertQuote(params: ConvertQuoteEstimateRequest): Promise<any[]>;
    convertTrade(params: ConvertTradeRequest): Promise<any[]>;
    getConvertHistory(params?: any): Promise<any[]>;
    /**
     *
     * Account endpoints (private)
     *
     */
    getBalance(ccy?: string): Promise<AccountBalance[]>;
    getPositions(params?: GetPositionsParams): Promise<AccountPosition[]>;
    getPositionsHistory(params?: GetHistoricPositionParams): Promise<HistoricAccountPosition[]>;
    getAccountPositionRisk(instType?: Omit<'SPOT', InstrumentType>): Promise<AccountPositionRisk[]>;
    /** Up to last 7 days */
    getBills(params?: any): Promise<AccountBill[]>;
    /** Last 3 months */
    getBillsArchive(params?: any): Promise<AccountBill[]>;
    getAccountConfiguration(): Promise<AccountConfiguration[]>;
    setPositionMode(posMode: PosMode): Promise<AccountPositionModeResult[]>;
    setLeverage(params: SetLeverageRequest): Promise<AccountLeverageResult[]>;
    /** Max buy/sell amount or open amount */
    getMaxBuySellAmount(params: {
        instId: string;
        tdMode: 'cross' | 'isolated' | 'cash';
        ccy?: string;
        px?: string;
        leverage?: string;
        unSpotOffset?: boolean;
    }): Promise<AccountMaxOrderAmount[]>;
    getMaxAvailableTradableAmount(params: {
        instId: string;
        ccy?: string;
        tdMode: 'cross' | 'isolated' | 'cash';
        reduceOnly?: boolean;
        unSpotOffset?: boolean;
    }): Promise<AccountMaxTradableAmount[]>;
    changePositionMargin(params: ChangePositionMarginRequest): Promise<AccountChangeMarginResult[]>;
    getLeverage(instId: string, mgnMode: MarginMode): Promise<AccountLeverage[]>;
    getLeverageEstimatedInfo(params: {
        instType: string;
        mgnMode: MarginMode;
        lever: string;
        instId?: string;
        ccy?: string;
        posSide: PositionSide;
    }): Promise<AdjustLeverageInfo[]>;
    getMaxLoan(instId: string, mgnMode: MarginMode, mgnCcy?: string): Promise<AccountMaxLoan[]>;
    getFeeRates(instType: InstrumentType, instId?: string, uly?: string): Promise<AccountFeeRate[]>;
    getInterestAccrued(params?: {
        type?: '1' | '2';
        ccy?: string;
        instId?: string;
        mgnMode?: MarginMode;
        after?: string;
        before?: string;
        limit?: string;
    }): Promise<InterestAccrued[]>;
    getInterestRate(ccy?: string): Promise<InterestRate[]>;
    setGreeksDisplayType(greeksType: 'PA' | 'BS'): Promise<Greeks[]>;
    setIsolatedMode(isoMode: 'automatic' | 'autonomy', type: 'MARGIN' | 'CONTRACTS'): Promise<AccountIsolatedMode[]>;
    getMaxWithdrawals(ccy?: string): Promise<MaxWithdrawal[]>;
    getAccountRiskState(): Promise<AccountRiskState[]>;
    borrowRepayVIPLoan(ccy: string, side: 'borrow' | 'repay', amt: numberInString, ordId?: string): Promise<any[]>;
    getVIPLoanBorrowRepayHistory(params?: any): Promise<any[]>;
    getBorrowInterestLimits(params?: {
        type?: '1' | '2';
        ccy?: string;
    }): Promise<any[]>;
    positionBuilder(params?: any): Promise<any[]>;
    getGreeks(ccy?: string): Promise<any[]>;
    getPMLimitation(params: {
        instType: 'SWAP' | 'FUTURES' | 'OPTION';
        uly?: string;
        instFamily?: string;
    }): Promise<any[]>;
    /**
     *
     * SubAccount endpoints (private)
     *
     */
    /** View sub-account list */
    getSubAccountList(params?: any): Promise<SubAccount[]>;
    /** Reset the APIKey of a sub-account */
    resetSubAccountAPIKey(subAcct: string, apiKey: string, options?: {
        label?: string;
        perm?: string;
        ip?: string;
    }): Promise<SubAccountAPIReset[]>;
    /** Get sub-account trading balance */
    getSubAccountBalances(subAcct: string): Promise<SubAccountBalances[]>;
    /** Get sub-account funding balance */
    getSubAccountFundingBalances(subAcct: string, ccy?: string): Promise<FundingBalance[]>;
    /** History of sub-account transfer */
    getSubAccountTransferHistory(params?: {
        ccy?: string;
        type?: '0' | '1';
        subAcct?: string;
        after?: string;
        before?: string;
        limit?: string;
    }): Promise<any[]>;
    /** Master accounts manage the transfers between sub-accounts */
    transferSubAccountBalance(params: SubAccountTransferRequest): Promise<SubAccountTransferResult[]>;
    /** Set Permission Of Transfer Out */
    setSubAccountTransferOutPermission(subAcct: string, canTransOut?: boolean): Promise<any[]>;
    /** Get custody trading sub-account list */
    getSubAccountCustodyTradingList(subAcct?: string): Promise<any[]>;
    /**
     *
     * Grid trading endpoints (private)
     *
     */
    placeGridAlgoOrder(params: GridAlgoOrderRequest): Promise<any[]>;
    amendGridAlgoOrder(algoId: string, instId: string, triggerPx: {
        slTriggerPx?: numberInString;
        tpTriggerPx?: numberInString;
    }): Promise<any[]>;
    stopGridAlgoOrder(orders: StopGridAlgoOrderRequest[]): Promise<any[]>;
    getGridAlgoOrderList(params: GetGridAlgoOrdersRequest): Promise<any[]>;
    getGridAlgoOrderHistory(params: GetGridAlgoOrdersRequest): Promise<any[]>;
    getGridAlgoOrderDetails(algoOrdType: GridAlgoOrderType, algoId: string): Promise<any[]>;
    getGridAlgoSubOrders(algoOrdType: GridAlgoOrderType, algoId: string, type: GridAlgoSubOrderType, groupId?: string, pagination?: {
        after?: numberInString;
        before?: numberInString;
        limit?: number;
    }): Promise<any[]>;
    /** Only contract grid supports this method */
    getGridAlgoOrderPositions(algoOrdType: 'contract_grid', algoId: string): Promise<any[]>;
    spotGridWithdrawIncome(algoId: string): Promise<any[]>;
    computeGridMarginBalance(algoId: string, type: 'add' | 'reduce', amt?: numberInString): Promise<any[]>;
    adjustGridMarginBalance(algoId: string, type: 'add' | 'reduce', change: {
        amt?: numberInString;
        percent?: numberInString;
    }): Promise<any[]>;
    getGridAIParameter(algoOrdType: GridAlgoOrderType, instId: string, direction: ContractGridDirection, duration?: '7D' | '30D' | '180D'): Promise<any[]>;
    /**
     *
     * Earn/staking endpoints (private)
     *
     */
    /** Get earn offers */
    getStakingOffers(params?: {
        productId?: string;
        protocolType?: 'staking' | 'defi';
        ccy?: string;
    }): Promise<APIResponse<any>>;
    /** Earn/staking purchase */
    submitStake(productId: string, investData: {
        ccy: string;
        amt: string;
    }[], term?: string): Promise<APIResponse<any>>;
    /** Earn/staking redeem */
    redeemStake(ordId: string, protocolType: 'staking' | 'defi', allowEarlyRedeem?: boolean): Promise<APIResponse<any>>;
    /** Earn/staking cancel purchases/redemptions */
    cancelStakingRequest(ordId: string, protocolType: 'staking' | 'defi'): Promise<APIResponse<any>>;
    /** Earn/staking get active orders */
    getActiveStakingOrders(params?: {
        productId?: string;
        protocolType?: 'staking' | 'defi';
        ccy?: string;
        state?: '8' | '13' | '9' | '1' | '2';
    }): Promise<APIResponse<any>>;
    /** Earn/staking get order history */
    getStakingOrderHistory(params?: {
        productId?: string;
        protocolType?: string;
        ccy?: string;
        after?: string;
        before?: string;
        limit?: string;
    }): Promise<APIResponse<any>>;
    /**
     *
     * Market data endpoints (public)
     *
     */
    getTickers(instrumentType: InstrumentType, uly?: string): Promise<Ticker[]>;
    getTicker(instId: string): Promise<Ticker[]>;
    getIndexTickers(params: {
        quoteCcy?: string;
        instId?: string;
    }): Promise<IndexTicker[]>;
    getOrderBook(instId: string, sz?: numberInString): Promise<OrderBook[]>;
    getCandles(instId: string, bar?: string, pagination?: Pagination): Promise<Candle[]>;
    getHistoricCandles(instId: string, bar?: string, pagination?: Pagination): Promise<Candle[]>;
    getIndexCandles(instId: string, bar?: string, pagination?: Pagination): Promise<CandleNoVolume[]>;
    getHistoricIndexCandles(instId: string, bar?: string, pagination?: Pagination): Promise<CandleNoVolume[]>;
    getMarkPriceCandles(instId: string, bar?: string, pagination?: Pagination): Promise<CandleNoVolume[]>;
    getHistoricMarkPriceCandles(instId: string, bar?: string, pagination?: Pagination): Promise<CandleNoVolume[]>;
    getTrades(instId: string, limit?: number): Promise<Trade[]>;
    getHistoricTrades(instId: string, pagination?: {
        after?: numberInString;
        before?: numberInString;
        limit?: numberInString;
        type?: '1' | '2';
    }): Promise<Trade[]>;
    get24hrTotalVolume(): Promise<any[]>;
    getOracle(): Promise<any[]>;
    getExchangeRate(): Promise<any[]>;
    getIndexComponents(index: string): Promise<any[]>;
    getBlockTickers(instType: InstrumentType, uly?: string): Promise<any[]>;
    getBlockTicker(instId: string): Promise<any[]>;
    getPublicBlockTrades(instId: string): Promise<any[]>;
    /**
     *
     * Public data endpoints (public)
     *
     */
    getInstruments(instType: InstrumentType, uly?: string, instFamily?: string, instId?: string): Promise<Instrument[]>;
    getDeliveryExerciseHistory(params: any): Promise<any[]>;
    getOpenInterest(params: any): Promise<any[]>;
    getFundingRate(params: any): Promise<any[]>;
    getFundingRateHistory(params: FundingRateRequest): Promise<any[]>;
    getMinMaxLimitPrice(params: any): Promise<any[]>;
    getOptionMarketData(params: any): Promise<any[]>;
    getEstimatedDeliveryExercisePrice(params: any): Promise<any[]>;
    getDiscountRateAndInterestFreeQuota(params: any): Promise<any[]>;
    getSystemTime(params: any): Promise<SystemTime[]>;
    getLiquidationOrders(params: any): Promise<any[]>;
    getMarkPrice(params: any): Promise<any[]>;
    getPositionTiers(params: any): Promise<any[]>;
    getInterestRateAndLoanQuota(params: any): Promise<any[]>;
    getVIPInterestRateAndLoanQuota(params: any): Promise<any[]>;
    getUnderlying(params: any): Promise<any[]>;
    getInsuranceFund(params: any): Promise<any[]>;
    getUnitConvert(params: UnitConvertRequest): Promise<UnitConvertData[]>;
    getEconomicCalendar(params: EconomicCalendarRequest): Promise<EconomicCalendarData[]>;
    /**
     *
     * Trading data endpoints (public)
     *
     */
    getSupportCoin(): Promise<any[]>;
    getTakerVolume(): Promise<any[]>;
    getMarginLendingRatio(params: {
        ccy: string;
        begin?: numberInString;
        end?: numberInString;
        period: '5m' | '1H' | '1D';
    }): Promise<any[]>;
    getLongShortRatio(params: {
        ccy: string;
        begin?: numberInString;
        end?: numberInString;
        period: '5m' | '1H' | '1D';
    }): Promise<any[]>;
    getContractsOpenInterestAndVolume(params: {
        ccy: string;
        begin?: numberInString;
        end?: numberInString;
        period: '5m' | '1H' | '1D';
    }): Promise<any[]>;
    getOptionsOpenInterestAndVolume(params: {
        ccy: string;
        period: '8H' | '1D';
    }): Promise<any[]>;
    getPutCallRatio(params: {
        ccy: string;
        period: '8H' | '1D';
    }): Promise<any[]>;
    getOpenInterestAndVolumeExpiry(params: {
        ccy: string;
        period: '8H' | '1D';
    }): Promise<any[]>;
    getOpenInterestAndVolumeStrike(params: {
        ccy: string;
        expTime: string;
        period: '8H' | '1D';
    }): Promise<any[]>;
    getTakerFlow(params: {
        ccy: string;
        period: '8H' | '1D';
    }): Promise<any[]>;
    /**
     *
     * Status endpoints (public)
     *
     */
    getSystemStatus(state?: 'scheduled' | 'ongoing' | 'pre_open' | 'completed' | 'canceled'): Promise<any[]>;
    /**
     *
     * Broker endpoints (private)
     *
     */
    getBrokerAccountInformation(): Promise<any[]>;
    createSubAccount(params: {
        subAcct: string;
        label?: string;
        clientIP?: string;
        mainAcct: string;
    }): Promise<any[]>;
    deleteSubAccount(params: {
        subAcct: string;
    }): Promise<any[]>;
    createSubAccountAPIKey(params: {
        subAcct: string;
        label: string;
        passphrase: string;
        ip?: string;
        perm?: string;
    }): Promise<any[]>;
}
