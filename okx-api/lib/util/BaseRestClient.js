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
exports.MISSING_CREDENTIALS_ERROR = void 0;
const axios_1 = __importDefault(require("axios"));
const node_support_1 = require("./node-support");
const requestUtils_1 = require("./requestUtils");
const typeGuards_1 = require("./typeGuards");
// axios.interceptors.request.use((request) => {
//   console.log(new Date(), 'Starting Request', JSON.stringify(request, null, 2));
//   return request;
// });
// axios.interceptors.response.use((response) => {
//   // console.log(new Date(), 'Response:', JSON.stringify(response, null, 2));
//   console.log(
//     new Date(),
//     'Response:',
//     JSON.stringify(
//       {
//         data: response.data,
//         headers: response.headers,
//       },
//       null,
//       2
//     )
//   );
//   return response;
// });
exports.MISSING_CREDENTIALS_ERROR = 'Private endpoints require api and secret to be provided in the REST client constructor';
class BaseRestClient {
    constructor(credentials, baseUrl, options = {}, requestOptions = {}, market) {
        // this.environment = environment;
        this.options = Object.assign({ 
            // if true, we'll throw errors if any params are undefined
            strict_param_validation: false }, options);
        this.baseUrl = baseUrl;
        // Allow empty object
        if (credentials &&
            (!credentials.apiKey || !credentials.apiSecret || !credentials.apiPass)) {
            throw new Error('API Key, Secret AND Passphrase are ALL required for private enpoints');
        }
        this.globalRequestOptions = Object.assign({ 
            // in ms == 5 minutes by default
            timeout: 1000 * 60 * 5 }, requestOptions);
        if (!this.globalRequestOptions.headers) {
            this.globalRequestOptions.headers = {};
        }
        //  Note: `x-simulated-trading: 1` needs to be added to the header of the Demo Trading request.
        if (market === 'demo') {
            this.globalRequestOptions.headers['x-simulated-trading'] = 1;
        }
        this.globalRequestOptions.headers['Content-Type'] = 'application/json';
        this.globalRequestOptions.headers['Accept'] = 'application/json';
        this.apiKey = credentials === null || credentials === void 0 ? void 0 : credentials.apiKey;
        this.apiSecret = credentials === null || credentials === void 0 ? void 0 : credentials.apiSecret;
        this.apiPassphrase = credentials === null || credentials === void 0 ? void 0 : credentials.apiPass;
    }
    get(endpoint, params) {
        return this._call('GET', endpoint, params, true);
    }
    post(endpoint, params) {
        return this._call('POST', endpoint, params, true);
    }
    getPrivate(endpoint, params) {
        return this._call('GET', endpoint, params, false);
    }
    postPrivate(endpoint, params) {
        return this._call('POST', endpoint, Array.isArray(params)
            ? params.map((p) => (Object.assign(Object.assign({}, p), { [requestUtils_1.programKey]: requestUtils_1.programId })))
            : Object.assign(Object.assign({}, params), { [requestUtils_1.programKey]: requestUtils_1.programId }), false);
    }
    deletePrivate(endpoint, params) {
        return this._call('DELETE', endpoint, params, false);
    }
    /**
     * Make a HTTP request to a specific endpoint. Private endpoints are automatically signed.
     */
    _call(method, endpoint, params, isPublicApi) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = Object.assign(Object.assign({}, this.globalRequestOptions), { url: [this.baseUrl, endpoint].join(endpoint.startsWith('/') ? '' : '/'), method: method, json: true });
           
            // Delete any params without value
            for (const key in params) {
                if (typeof params[key] === 'undefined') {
                    delete params[key];
                }
            }
            const tsISO = new Date().toISOString();
            const signResult = yield this.signRequest(isPublicApi, tsISO, method, endpoint, params);
            if (!options.headers) {
                options.headers = {};
            }
            if (!isPublicApi) {
                options.headers['OK-ACCESS-KEY'] = this.apiKey;
                options.headers['OK-ACCESS-SIGN'] = signResult.sign;
                options.headers['OK-ACCESS-TIMESTAMP'] = tsISO;
                options.headers['OK-ACCESS-PASSPHRASE'] = this.apiPassphrase;
            }
            if (method === 'GET') {
                options.params = signResult.requestBody;
            }
            else {
                options.data = signResult.requestBody;
            }
            // console.log(new Date(), 'request: ', {
            // url: options.url,
            // method,
            // params: signResult.requestBody,
            // sign: signResult.sign,
            //   options,
            // });
            return (0, axios_1.default)(options)
                .then((response) => {
                var _a;
                // Check this is an API response without an error code.
                // If so, resolve the nested data property, else throw the full response body
                if ((0, typeGuards_1.isRawAPIResponse)(response.data) &&
                    response.status == 200 &&
                    ((_a = response.data) === null || _a === void 0 ? void 0 : _a.code) === '0') {
                    return response.data.data;
                }
                // console.log('request: ', JSON.stringify(options, null, 2));
                // console.log(
                //   'bad response: ',
                //   JSON.stringify(
                //     {
                //       data: response.data,
                //       headers: response.headers,
                //     },
                //     null,
                //     2
                //   )
                // );
                // Also throw if API returned error code
                // This API error thrown by the exchange will be post-processed by the exception parser
                throw { response };
            })
                .catch((e) => this.parseException(e));
        });
    }
    /**
     * Sign request
     */
    signRequest(isPublicApi, tsISO, method, endpoint, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = {
                requestBody: params,
                method,
                endpoint,
                sign: '',
            };
            if (isPublicApi) {
                return res;
            }
            if (!this.apiKey || !this.apiSecret || !this.apiPassphrase) {
                throw new Error(exports.MISSING_CREDENTIALS_ERROR);
            }
            const serializedParams = (0, requestUtils_1.serializeParams)(params, method, this.options.strict_param_validation);
            const message = tsISO + method + endpoint + serializedParams;
            // console.log(new Date(), `Sign params: `, {
            //   message,
            //   secret: this.apiSecret,
            // });
            return Object.assign(Object.assign({}, res), { sign: (0, node_support_1.signMessage)(message, this.apiSecret) });
        });
    }
    /**
     * Generic handler to parse request exceptions
     */
    parseException(e) {
        if (this.options.parse_exceptions === false) {
            throw e;
        }
        // Something happened in setting up the request that triggered an Error
        if (!e.response) {
            if (!e.request) {
                throw e.message;
            }
            // request made but no response received
            throw e;
        }
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const response = e.response;
        throw response.data;
        // throw {
        //   status: response.status,
        //   statusText: response.statusText,
        //   data: response.data,
        //   headers: response.headers,
        //   requestOptions: this.options,
        // };
    }
}
exports.default = BaseRestClient;
//# sourceMappingURL=BaseRestClient.js.map