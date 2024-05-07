import { AxiosRequestConfig } from 'axios';
import { APICredentials, APIMarket, RestClientOptions } from '../types';
export declare const MISSING_CREDENTIALS_ERROR = "Private endpoints require api and secret to be provided in the REST client constructor";
export default abstract class BaseRestClient {
    private options;
    private baseUrl;
    private globalRequestOptions;
    private apiKey;
    private apiSecret;
    private apiPassphrase;
    constructor(credentials: APICredentials | undefined | null, baseUrl: string, options: RestClientOptions | undefined, requestOptions: AxiosRequestConfig<any> | undefined, market: APIMarket);
    get(endpoint: string, params?: any): Promise<any>;
    post(endpoint: string, params?: any): Promise<any>;
    getPrivate(endpoint: string, params?: any): Promise<any>;
    postPrivate(endpoint: string, params?: any): Promise<any>;
    deletePrivate(endpoint: string, params?: any): Promise<any>;
    /**
     * Make a HTTP request to a specific endpoint. Private endpoints are automatically signed.
     */
    private _call;
    /**
     * Sign request
     */
    private signRequest;
    /**
     * Generic handler to parse request exceptions
     */
    private parseException;
}
