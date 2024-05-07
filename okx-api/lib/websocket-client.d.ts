/// <reference types="node" />
import { EventEmitter } from 'events';
import WebSocket from 'isomorphic-ws';
import { WsChannelSubUnSubRequestArg, WSClientConfigurableOptions, WsDataEvent, WsEvent } from './types';
import { DefaultLogger, WsStore } from './util';
import { WsKey } from './util/websocket-util';
export type WsClientEvent = 'open' | 'update' | 'close' | 'error' | 'reconnect' | 'reconnected' | 'response';
type WsKeyObject = {
    wsKey: WsKey;
};
interface WebsocketClientEvents {
    /** Connection opened. If this connection was previously opened and reconnected, expect the reconnected event instead */
    open: (evt: {
        event: any;
    } & WsKeyObject) => void;
    /** Reconnecting a dropped connection */
    reconnect: (evt: {
        event: any;
    } & WsKeyObject) => void;
    /** Successfully reconnected a connection that dropped */
    reconnected: (evt: {
        event: any;
    } & WsKeyObject) => void;
    /** Connection closed */
    close: (evt: {
        event: any;
    } & WsKeyObject) => void;
    /** Received reply to websocket command (e.g. after subscribing to topics or authenticating) */
    response: (response: WsEvent & WsKeyObject) => void;
    /** Received data for a topic/channel */
    update: (response: WsDataEvent & WsKeyObject) => void;
    /** Exception from ws client OR custom listeners */
    error: (response: any) => void;
}
export declare interface WebsocketClient {
    on<U extends keyof WebsocketClientEvents>(event: U, listener: WebsocketClientEvents[U]): this;
    emit<U extends keyof WebsocketClientEvents>(event: U, ...args: Parameters<WebsocketClientEvents[U]>): boolean;
}
export declare class WebsocketClient extends EventEmitter {
    private logger;
    private options;
    private wsStore;
    constructor(options: WSClientConfigurableOptions, logger?: typeof DefaultLogger);
    /**
     * Subscribe to topics & track/persist them. They will be automatically resubscribed to if the connection drops/reconnects.
     * @param wsEvents topic or list of topics
     * @param isPrivateTopic optional - the library will try to detect private topics, you can use this to mark a topic as private (if the topic isn't recognised yet)
     */
    subscribe(wsEvents: WsChannelSubUnSubRequestArg[] | WsChannelSubUnSubRequestArg, isPrivateTopic?: boolean): void;
    /**
     * Unsubscribe from topics & remove them from memory. They won't be re-subscribed to if the connection reconnects.
     * @param wsTopics topic or list of topics
     * @param isPrivateTopic optional - the library will try to detect private topics, you can use this to mark a topic as private (if the topic isn't recognised yet)
     */
    unsubscribe(wsTopics: WsChannelSubUnSubRequestArg[] | WsChannelSubUnSubRequestArg, isPrivateTopic?: boolean): void;
    /** Get the WsStore that tracks websocket & topic state */
    getWsStore(): WsStore<WsChannelSubUnSubRequestArg>;
    close(wsKey: WsKey, force?: boolean): void;
    closeAll(force?: boolean): void;
    /**
     * Request connection of all dependent (public & private) websockets, instead of waiting for automatic connection by library
     */
    connectAll(): Promise<WebSocket | undefined>[];
    connectPublic(businessEndpoint?: boolean): Promise<WebSocket | undefined>;
    connectPrivate(businessEndpoint?: boolean): Promise<WebSocket | undefined>;
    private connect;
    private parseWsError;
    /**
     * Return params required to make authorized request
     */
    private getWsAuthRequest;
    private getWsAuthSignature;
    private sendAuthRequest;
    private reconnectWithDelay;
    private ping;
    /**
     * Closes a connection, if it's even open. If open, this will trigger a reconnect asynchronously.
     * If closed, trigger a reconnect immediately
     */
    private executeReconnectableClose;
    private clearTimers;
    private clearPingTimer;
    private clearPongTimer;
    private clearReconnectTimer;
    /**
     * @private Use the `subscribe(topics)` method to subscribe to topics. Send WS message to subscribe to topics.
     */
    private requestSubscribeTopics;
    /**
     * @private Use the `unsubscribe(topics)` method to unsubscribe from topics. Send WS message to unsubscribe from topics.
     */
    private requestUnsubscribeTopics;
    tryWsSend(wsKey: WsKey, wsMessage: string): void;
    private connectToWsUrl;
    private onWsOpen;
    private onWsMessage;
    private onWsClose;
}
export {};
