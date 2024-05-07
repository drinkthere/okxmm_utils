import { APIMarket, WebsocketClientOptions, WsChannel } from '../types';
export declare const WS_BASE_URL_MAP: Record<APIMarket, Record<'public' | 'private', string>>;
export declare const WS_KEY_MAP: {
    readonly prodPublic: "prodPublic";
    readonly prodPrivate: "prodPrivate";
    readonly awsPublic: "awsPublic";
    readonly awsPrivate: "awsPrivate";
    readonly demoPublic: "demoPublic";
    readonly demoPrivate: "demoPrivate";
    readonly businessPrivate: "businessPrivate";
    readonly businessPublic: "businessPublic";
    readonly businessAwsPrivate: "businessAwsPrivate";
    readonly businessAwsPublic: "businessAwsPublic";
    readonly businessDemoPublic: "businessDemoPublic";
    readonly businessDemoPrivate: "businessDemoPrivate";
};
/** This is used to differentiate between each of the available websocket streams (as bybit has multiple websockets) */
export type WsKey = (typeof WS_KEY_MAP)[keyof typeof WS_KEY_MAP];
export declare const PRIVATE_WS_KEYS: WsKey[];
export declare const PUBLIC_WS_KEYS: WsKey[];
/** Determine which WsKey (ws connection) to route an event to */
export declare function getWsKeyForTopicChannel(market: APIMarket, channel: WsChannel, isPrivate?: boolean): WsKey;
export declare function getWsKeyForMarket(market: APIMarket, isPrivate: boolean, isBusinessChannel: boolean): WsKey;
/** Maps a WS key back to a WS URL */
export declare function getWsUrlForWsKey(wsKey: WsKey, wsClientOptions: WebsocketClientOptions): string;
export declare function getMaxTopicsPerSubscribeEvent(market: APIMarket): number | null;
export declare function isWsPong(event: unknown): boolean;
export declare const WS_EVENT_CODE_ENUM: {
    OK: string;
    LOGIN_FAILED: string;
    LOGIN_PARTIALLY_FAILED: string;
};
