import WebSocket from 'isomorphic-ws';
import { DefaultLogger } from './logger';
import { WsKey } from './websocket-util';
export declare enum WsConnectionStateEnum {
    INITIAL = 0,
    CONNECTING = 1,
    CONNECTED = 2,
    CLOSING = 3,
    RECONNECTING = 4
}
/** A "topic" is always a string */
type WsTopic = string;
/**
 * A "Set" is used to ensure we only subscribe to a topic once (tracking a list of unique topics we're expected to be connected to)
 * Note: Accurate duplicate tracking only works for plaintext topics. E.g. JSON objects may not be seen as duplicates if keys are in different orders. If that's needed, check the FTX implementation.
 */
interface WsStoredState<WSTopic> {
    /** The currently active websocket connection */
    ws?: WebSocket;
    /** The current lifecycle state of the connection (enum) */
    connectionState?: WsConnectionStateEnum;
    /** A timer that will send an upstream heartbeat (ping) when it expires */
    activePingTimer?: ReturnType<typeof setTimeout> | undefined;
    /** A timer tracking that an upstream heartbeat was sent, expecting a reply before it expires */
    activePongTimer?: ReturnType<typeof setTimeout> | undefined;
    /** If a reconnection is in progress, this will have the timer for the delayed reconnect */
    activeReconnectTimer?: ReturnType<typeof setTimeout> | undefined;
    /**
     * All the topics we are expected to be subscribed to (and we automatically resubscribed to if the connection drops)
     * A "Set" is used to ensure we only subscribe to a topic once (tracking a list of unique topics we're expected to be connected to)
     *
     * Note: Accurate duplicate tracking using a Set only works for plaintext topics. E.g. JSON objects may not be seen as duplicates if keys are in different orders.
     * More complex topics (objects) are matched using the isDeepObjectMatch function
     */
    subscribedTopics: Set<WSTopic>;
}
export declare function isDeepObjectMatch(object1: any, object2: any): boolean;
type WSSimpleTopic = string;
export declare class WsStore<WSComplexTopic> {
    private wsState;
    private logger;
    constructor(logger: typeof DefaultLogger);
    /** Get WS stored state for key, optionally create if missing */
    get(wsKey: WsKey, createIfMissing?: true): WsStoredState<WSComplexTopic | WSSimpleTopic>;
    get(wsKey: WsKey, createIfMissing?: false): WsStoredState<WSComplexTopic | WSSimpleTopic> | undefined;
    getKeys(): WsKey[];
    create(wsKey: WsKey): WsStoredState<WSComplexTopic | WSSimpleTopic> | undefined;
    delete(wsKey: WsKey): void;
    hasExistingActiveConnection(wsKey: WsKey): boolean;
    getWs(wsKey: WsKey): WebSocket | undefined;
    setWs(wsKey: WsKey, wsConnection: WebSocket): WebSocket;
    isWsOpen(wsKey: WsKey): boolean;
    getConnectionState(wsKey: WsKey): WsConnectionStateEnum;
    setConnectionState(wsKey: WsKey, state: WsConnectionStateEnum): void;
    isConnectionState(wsKey: WsKey, state: WsConnectionStateEnum): boolean;
    getTopics(wsKey: WsKey): Set<WSComplexTopic | WSSimpleTopic>;
    getTopicsByKey(): Record<string, Set<WSComplexTopic | WSSimpleTopic>>;
    addTopic(wsKey: WsKey, topic: WsTopic): Set<string | WSComplexTopic>;
    /** Add subscribed topic to store, only if not already subscribed */
    addComplexTopic(wsKey: WsKey, topic: WSComplexTopic): Set<string | WSComplexTopic>;
    deleteTopic(wsKey: WsKey, topic: WsTopic): boolean;
    /** Remove subscribed topic from store */
    deleteComplexTopic(wsKey: WsKey, topic: WSComplexTopic): Set<string | WSComplexTopic>;
    getMatchingTopic(key: WsKey, topic: WsTopic | WSComplexTopic): WSComplexTopic | WSSimpleTopic | undefined;
}
export {};
