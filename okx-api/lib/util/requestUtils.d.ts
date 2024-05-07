import { Method } from 'axios';
import { APIMarket, RestClientOptions } from '../types';
export declare function serializeParams(params: object | undefined, method: Method, strict_validation?: boolean): string;
export declare const programKey = "tag";
export declare const programId = "159881cb7207BCDE";
export declare function getRestBaseUrl(market: APIMarket, restClientOptions: RestClientOptions): string;
export declare function isWsPong(response: any): any;
