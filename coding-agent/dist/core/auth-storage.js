"use strict";
/**
 * Credential storage for API keys and OAuth tokens.
 * Handles loading, saving, and refreshing credentials from auth.json.
 *
 * Uses file locking to prevent race conditions when multiple pi instances
 * try to refresh tokens simultaneously.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthStorage = exports.InMemoryAuthStorageBackend = exports.FileAuthStorageBackend = void 0;
var pi_ai_1 = require("@mariozechner/pi-ai");
var oauth_1 = require("@mariozechner/pi-ai/oauth");
var fs_1 = require("fs");
var path_1 = require("path");
var proper_lockfile_1 = require("proper-lockfile");
var config_js_1 = require("../config.js");
var resolve_config_value_js_1 = require("./resolve-config-value.js");
var FileAuthStorageBackend = /** @class */ (function () {
    function FileAuthStorageBackend(authPath) {
        if (authPath === void 0) { authPath = (0, path_1.join)((0, config_js_1.getAgentDir)(), "auth.json"); }
        this.authPath = authPath;
    }
    FileAuthStorageBackend.prototype.ensureParentDir = function () {
        var dir = (0, path_1.dirname)(this.authPath);
        if (!(0, fs_1.existsSync)(dir)) {
            (0, fs_1.mkdirSync)(dir, { recursive: true, mode: 448 });
        }
    };
    FileAuthStorageBackend.prototype.ensureFileExists = function () {
        if (!(0, fs_1.existsSync)(this.authPath)) {
            (0, fs_1.writeFileSync)(this.authPath, "{}", "utf-8");
            (0, fs_1.chmodSync)(this.authPath, 384);
        }
    };
    FileAuthStorageBackend.prototype.acquireLockSyncWithRetry = function (path) {
        var _a;
        var maxAttempts = 10;
        var delayMs = 20;
        var lastError;
        for (var attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return proper_lockfile_1.default.lockSync(path, { realpath: false });
            }
            catch (error) {
                var code = typeof error === "object" && error !== null && "code" in error
                    ? String(error.code)
                    : undefined;
                if (code !== "ELOCKED" || attempt === maxAttempts) {
                    throw error;
                }
                lastError = error;
                var start = Date.now();
                while (Date.now() - start < delayMs) {
                    // Sleep synchronously to avoid changing callers to async.
                }
            }
        }
        throw (_a = lastError) !== null && _a !== void 0 ? _a : new Error("Failed to acquire auth storage lock");
    };
    FileAuthStorageBackend.prototype.withLock = function (fn) {
        this.ensureParentDir();
        this.ensureFileExists();
        var release;
        try {
            release = this.acquireLockSyncWithRetry(this.authPath);
            var current = (0, fs_1.existsSync)(this.authPath) ? (0, fs_1.readFileSync)(this.authPath, "utf-8") : undefined;
            var _a = fn(current), result = _a.result, next = _a.next;
            if (next !== undefined) {
                (0, fs_1.writeFileSync)(this.authPath, next, "utf-8");
                (0, fs_1.chmodSync)(this.authPath, 384);
            }
            return result;
        }
        finally {
            if (release) {
                release();
            }
        }
    };
    FileAuthStorageBackend.prototype.withLockAsync = function (fn) {
        return __awaiter(this, void 0, void 0, function () {
            var release, lockCompromised, lockCompromisedError, throwIfCompromised, current, _a, result, next, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.ensureParentDir();
                        this.ensureFileExists();
                        lockCompromised = false;
                        throwIfCompromised = function () {
                            if (lockCompromised) {
                                throw lockCompromisedError !== null && lockCompromisedError !== void 0 ? lockCompromisedError : new Error("Auth storage lock was compromised");
                            }
                        };
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, , 4, 9]);
                        return [4 /*yield*/, proper_lockfile_1.default.lock(this.authPath, {
                                retries: {
                                    retries: 10,
                                    factor: 2,
                                    minTimeout: 100,
                                    maxTimeout: 10000,
                                    randomize: true,
                                },
                                stale: 30000,
                                onCompromised: function (err) {
                                    lockCompromised = true;
                                    lockCompromisedError = err;
                                },
                            })];
                    case 2:
                        release = _c.sent();
                        throwIfCompromised();
                        current = (0, fs_1.existsSync)(this.authPath) ? (0, fs_1.readFileSync)(this.authPath, "utf-8") : undefined;
                        return [4 /*yield*/, fn(current)];
                    case 3:
                        _a = _c.sent(), result = _a.result, next = _a.next;
                        throwIfCompromised();
                        if (next !== undefined) {
                            (0, fs_1.writeFileSync)(this.authPath, next, "utf-8");
                            (0, fs_1.chmodSync)(this.authPath, 384);
                        }
                        throwIfCompromised();
                        return [2 /*return*/, result];
                    case 4:
                        if (!release) return [3 /*break*/, 8];
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, release()];
                    case 6:
                        _c.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        _b = _c.sent();
                        return [3 /*break*/, 8];
                    case 8: return [7 /*endfinally*/];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    return FileAuthStorageBackend;
}());
exports.FileAuthStorageBackend = FileAuthStorageBackend;
var InMemoryAuthStorageBackend = /** @class */ (function () {
    function InMemoryAuthStorageBackend() {
    }
    InMemoryAuthStorageBackend.prototype.withLock = function (fn) {
        var _a = fn(this.value), result = _a.result, next = _a.next;
        if (next !== undefined) {
            this.value = next;
        }
        return result;
    };
    InMemoryAuthStorageBackend.prototype.withLockAsync = function (fn) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, result, next;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, fn(this.value)];
                    case 1:
                        _a = _b.sent(), result = _a.result, next = _a.next;
                        if (next !== undefined) {
                            this.value = next;
                        }
                        return [2 /*return*/, result];
                }
            });
        });
    };
    return InMemoryAuthStorageBackend;
}());
exports.InMemoryAuthStorageBackend = InMemoryAuthStorageBackend;
/**
 * Credential storage backed by a JSON file.
 */
var AuthStorage = /** @class */ (function () {
    function AuthStorage(storage) {
        this.storage = storage;
        this.data = {};
        this.runtimeOverrides = new Map();
        this.loadError = null;
        this.errors = [];
        this.reload();
    }
    AuthStorage.create = function (authPath) {
        return new AuthStorage(new FileAuthStorageBackend(authPath !== null && authPath !== void 0 ? authPath : (0, path_1.join)((0, config_js_1.getAgentDir)(), "auth.json")));
    };
    AuthStorage.fromStorage = function (storage) {
        return new AuthStorage(storage);
    };
    AuthStorage.inMemory = function (data) {
        if (data === void 0) { data = {}; }
        var storage = new InMemoryAuthStorageBackend();
        storage.withLock(function () { return ({ result: undefined, next: JSON.stringify(data, null, 2) }); });
        return AuthStorage.fromStorage(storage);
    };
    /**
     * Set a runtime API key override (not persisted to disk).
     * Used for CLI --api-key flag.
     */
    AuthStorage.prototype.setRuntimeApiKey = function (provider, apiKey) {
        this.runtimeOverrides.set(provider, apiKey);
    };
    /**
     * Remove a runtime API key override.
     */
    AuthStorage.prototype.removeRuntimeApiKey = function (provider) {
        this.runtimeOverrides.delete(provider);
    };
    /**
     * Set a fallback resolver for API keys not found in auth.json or env vars.
     * Used for custom provider keys from models.json.
     */
    AuthStorage.prototype.setFallbackResolver = function (resolver) {
        this.fallbackResolver = resolver;
    };
    AuthStorage.prototype.recordError = function (error) {
        var normalizedError = error instanceof Error ? error : new Error(String(error));
        this.errors.push(normalizedError);
    };
    AuthStorage.prototype.parseStorageData = function (content) {
        if (!content) {
            return {};
        }
        return JSON.parse(content);
    };
    /**
     * Reload credentials from storage.
     */
    AuthStorage.prototype.reload = function () {
        var content;
        try {
            this.storage.withLock(function (current) {
                content = current;
                return { result: undefined };
            });
            this.data = this.parseStorageData(content);
            this.loadError = null;
        }
        catch (error) {
            this.loadError = error;
            this.recordError(error);
        }
    };
    AuthStorage.prototype.persistProviderChange = function (provider, credential) {
        var _this = this;
        if (this.loadError) {
            return;
        }
        try {
            this.storage.withLock(function (current) {
                var currentData = _this.parseStorageData(current);
                var merged = __assign({}, currentData);
                if (credential) {
                    merged[provider] = credential;
                }
                else {
                    delete merged[provider];
                }
                return { result: undefined, next: JSON.stringify(merged, null, 2) };
            });
        }
        catch (error) {
            this.recordError(error);
        }
    };
    /**
     * Get credential for a provider.
     */
    AuthStorage.prototype.get = function (provider) {
        var _a;
        return (_a = this.data[provider]) !== null && _a !== void 0 ? _a : undefined;
    };
    /**
     * Set credential for a provider.
     */
    AuthStorage.prototype.set = function (provider, credential) {
        this.data[provider] = credential;
        this.persistProviderChange(provider, credential);
    };
    /**
     * Remove credential for a provider.
     */
    AuthStorage.prototype.remove = function (provider) {
        delete this.data[provider];
        this.persistProviderChange(provider, undefined);
    };
    /**
     * List all providers with credentials.
     */
    AuthStorage.prototype.list = function () {
        return Object.keys(this.data);
    };
    /**
     * Check if credentials exist for a provider in auth.json.
     */
    AuthStorage.prototype.has = function (provider) {
        return provider in this.data;
    };
    /**
     * Check if any form of auth is configured for a provider.
     * Unlike getApiKey(), this doesn't refresh OAuth tokens.
     */
    AuthStorage.prototype.hasAuth = function (provider) {
        var _a;
        if (this.runtimeOverrides.has(provider))
            return true;
        if (this.data[provider])
            return true;
        if ((0, pi_ai_1.getEnvApiKey)(provider))
            return true;
        if ((_a = this.fallbackResolver) === null || _a === void 0 ? void 0 : _a.call(this, provider))
            return true;
        return false;
    };
    /**
     * Get all credentials (for passing to getOAuthApiKey).
     */
    AuthStorage.prototype.getAll = function () {
        return __assign({}, this.data);
    };
    AuthStorage.prototype.drainErrors = function () {
        var drained = __spreadArray([], this.errors, true);
        this.errors = [];
        return drained;
    };
    /**
     * Login to an OAuth provider.
     */
    AuthStorage.prototype.login = function (providerId, callbacks) {
        return __awaiter(this, void 0, void 0, function () {
            var provider, credentials;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        provider = (0, oauth_1.getOAuthProvider)(providerId);
                        if (!provider) {
                            throw new Error("Unknown OAuth provider: ".concat(providerId));
                        }
                        return [4 /*yield*/, provider.login(callbacks)];
                    case 1:
                        credentials = _a.sent();
                        this.set(providerId, __assign({ type: "oauth" }, credentials));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Logout from a provider.
     */
    AuthStorage.prototype.logout = function (provider) {
        this.remove(provider);
    };
    /**
     * Refresh OAuth token with backend locking to prevent race conditions.
     * Multiple pi instances may try to refresh simultaneously when tokens expire.
     */
    AuthStorage.prototype.refreshOAuthTokenWithLock = function (providerId) {
        return __awaiter(this, void 0, void 0, function () {
            var provider, result;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        provider = (0, oauth_1.getOAuthProvider)(providerId);
                        if (!provider) {
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, this.storage.withLockAsync(function (current) { return __awaiter(_this, void 0, void 0, function () {
                                var currentData, cred, oauthCreds, _i, _a, _b, key, value, refreshed, merged;
                                var _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            currentData = this.parseStorageData(current);
                                            this.data = currentData;
                                            this.loadError = null;
                                            cred = currentData[providerId];
                                            if ((cred === null || cred === void 0 ? void 0 : cred.type) !== "oauth") {
                                                return [2 /*return*/, { result: null }];
                                            }
                                            if (Date.now() < cred.expires) {
                                                return [2 /*return*/, { result: { apiKey: provider.getApiKey(cred), newCredentials: cred } }];
                                            }
                                            oauthCreds = {};
                                            for (_i = 0, _a = Object.entries(currentData); _i < _a.length; _i++) {
                                                _b = _a[_i], key = _b[0], value = _b[1];
                                                if (value.type === "oauth") {
                                                    oauthCreds[key] = value;
                                                }
                                            }
                                            return [4 /*yield*/, (0, oauth_1.getOAuthApiKey)(providerId, oauthCreds)];
                                        case 1:
                                            refreshed = _d.sent();
                                            if (!refreshed) {
                                                return [2 /*return*/, { result: null }];
                                            }
                                            merged = __assign(__assign({}, currentData), (_c = {}, _c[providerId] = __assign({ type: "oauth" }, refreshed.newCredentials), _c));
                                            this.data = merged;
                                            this.loadError = null;
                                            return [2 /*return*/, { result: refreshed, next: JSON.stringify(merged, null, 2) }];
                                    }
                                });
                            }); })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Get API key for a provider.
     * Priority:
     * 1. Runtime override (CLI --api-key)
     * 2. API key from auth.json
     * 3. OAuth token from auth.json (auto-refreshed with locking)
     * 4. Environment variable
     * 5. Fallback resolver (models.json custom providers)
     */
    AuthStorage.prototype.getApiKey = function (providerId) {
        return __awaiter(this, void 0, void 0, function () {
            var runtimeKey, cred, provider, needsRefresh, result, error_1, updatedCred, envKey;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        runtimeKey = this.runtimeOverrides.get(providerId);
                        if (runtimeKey) {
                            return [2 /*return*/, runtimeKey];
                        }
                        cred = this.data[providerId];
                        if ((cred === null || cred === void 0 ? void 0 : cred.type) === "api_key") {
                            return [2 /*return*/, (0, resolve_config_value_js_1.resolveConfigValue)(cred.key)];
                        }
                        if (!((cred === null || cred === void 0 ? void 0 : cred.type) === "oauth")) return [3 /*break*/, 6];
                        provider = (0, oauth_1.getOAuthProvider)(providerId);
                        if (!provider) {
                            // Unknown OAuth provider, can't get API key
                            return [2 /*return*/, undefined];
                        }
                        needsRefresh = Date.now() >= cred.expires;
                        if (!needsRefresh) return [3 /*break*/, 5];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.refreshOAuthTokenWithLock(providerId)];
                    case 2:
                        result = _c.sent();
                        if (result) {
                            return [2 /*return*/, result.apiKey];
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _c.sent();
                        this.recordError(error_1);
                        // Refresh failed - re-read file to check if another instance succeeded
                        this.reload();
                        updatedCred = this.data[providerId];
                        if ((updatedCred === null || updatedCred === void 0 ? void 0 : updatedCred.type) === "oauth" && Date.now() < updatedCred.expires) {
                            // Another instance refreshed successfully, use those credentials
                            return [2 /*return*/, provider.getApiKey(updatedCred)];
                        }
                        // Refresh truly failed - return undefined so model discovery skips this provider
                        // User can /login to re-authenticate (credentials preserved for retry)
                        return [2 /*return*/, undefined];
                    case 4: return [3 /*break*/, 6];
                    case 5: 
                    // Token not expired, use current access token
                    return [2 /*return*/, provider.getApiKey(cred)];
                    case 6:
                        envKey = (0, pi_ai_1.getEnvApiKey)(providerId);
                        if (envKey)
                            return [2 /*return*/, envKey];
                        // Fall back to custom resolver (e.g., models.json custom providers)
                        return [2 /*return*/, (_b = (_a = this.fallbackResolver) === null || _a === void 0 ? void 0 : _a.call(this, providerId)) !== null && _b !== void 0 ? _b : undefined];
                }
            });
        });
    };
    /**
     * Get all registered OAuth providers
     */
    AuthStorage.prototype.getOAuthProviders = function () {
        return (0, oauth_1.getOAuthProviders)();
    };
    return AuthStorage;
}());
exports.AuthStorage = AuthStorage;
