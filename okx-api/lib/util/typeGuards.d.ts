import { WsDataEvent, WsEvent, WsLoginEvent } from '../types';
import { APIResponse } from '../types/rest';
export declare function isRawAPIResponse(response: unknown): response is APIResponse<unknown>;
/** Simple type guard that a websocket event extends a known event schema */
export declare function isWsEvent(evtData: unknown): evtData is WsEvent;
export declare function isWsDataEvent(evtData: unknown): evtData is WsDataEvent;
export declare function isWsErrorEvent(evt: unknown): boolean;
/** Usually a response to authenticating over ws */
export declare function isWsLoginEvent(evt: unknown): evt is WsLoginEvent;
/** A response to subscribing to a channel */
export declare function isWsSubscribeEvent(evtData: unknown): boolean;
/** A response to unsubscribing from a channel */
export declare function isWsUnsubscribeEvent(evtData: unknown): boolean;
/** Information event */
export declare function isConnCountEvent(evtData: unknown): boolean;
/** Simple typescript guard never expecting code to reach it (will throw typescript error if called) */
export declare function neverGuard(x: never, msg: string): Error;
