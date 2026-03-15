"use strict";
/**
 * Print mode (single-shot): Send prompts, output result, exit.
 *
 * Used for:
 * - `pi -p "prompt"` - text output
 * - `pi --mode json "prompt"` - JSON event stream
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPrintMode = runPrintMode;
/**
 * Run in print (single-shot) mode.
 * Sends prompts to the agent and outputs the result.
 */
function runPrintMode(session, options) {
    return __awaiter(this, void 0, void 0, function () {
        var mode, _a, messages, initialMessage, initialImages, header, _i, messages_1, message, state, lastMessage, assistantMsg, _b, _c, content;
        var _this = this;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    mode = options.mode, _a = options.messages, messages = _a === void 0 ? [] : _a, initialMessage = options.initialMessage, initialImages = options.initialImages;
                    if (mode === "json") {
                        header = session.sessionManager.getHeader();
                        if (header) {
                            console.log(JSON.stringify(header));
                        }
                    }
                    // Set up extensions for print mode (no UI)
                    return [4 /*yield*/, session.bindExtensions({
                            commandContextActions: {
                                waitForIdle: function () { return session.agent.waitForIdle(); },
                                newSession: function (options) { return __awaiter(_this, void 0, void 0, function () {
                                    var success;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, session.newSession({ parentSession: options === null || options === void 0 ? void 0 : options.parentSession })];
                                            case 1:
                                                success = _a.sent();
                                                if (!(success && (options === null || options === void 0 ? void 0 : options.setup))) return [3 /*break*/, 3];
                                                return [4 /*yield*/, options.setup(session.sessionManager)];
                                            case 2:
                                                _a.sent();
                                                _a.label = 3;
                                            case 3: return [2 /*return*/, { cancelled: !success }];
                                        }
                                    });
                                }); },
                                fork: function (entryId) { return __awaiter(_this, void 0, void 0, function () {
                                    var result;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, session.fork(entryId)];
                                            case 1:
                                                result = _a.sent();
                                                return [2 /*return*/, { cancelled: result.cancelled }];
                                        }
                                    });
                                }); },
                                navigateTree: function (targetId, options) { return __awaiter(_this, void 0, void 0, function () {
                                    var result;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, session.navigateTree(targetId, {
                                                    summarize: options === null || options === void 0 ? void 0 : options.summarize,
                                                    customInstructions: options === null || options === void 0 ? void 0 : options.customInstructions,
                                                    replaceInstructions: options === null || options === void 0 ? void 0 : options.replaceInstructions,
                                                    label: options === null || options === void 0 ? void 0 : options.label,
                                                })];
                                            case 1:
                                                result = _a.sent();
                                                return [2 /*return*/, { cancelled: result.cancelled }];
                                        }
                                    });
                                }); },
                                switchSession: function (sessionPath) { return __awaiter(_this, void 0, void 0, function () {
                                    var success;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, session.switchSession(sessionPath)];
                                            case 1:
                                                success = _a.sent();
                                                return [2 /*return*/, { cancelled: !success }];
                                        }
                                    });
                                }); },
                                reload: function () { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, session.reload()];
                                            case 1:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); },
                            },
                            onError: function (err) {
                                console.error("Extension error (".concat(err.extensionPath, "): ").concat(err.error));
                            },
                        })];
                case 1:
                    // Set up extensions for print mode (no UI)
                    _d.sent();
                    // Always subscribe to enable session persistence via _handleAgentEvent
                    session.subscribe(function (event) {
                        // In JSON mode, output all events
                        if (mode === "json") {
                            console.log(JSON.stringify(event));
                        }
                    });
                    if (!initialMessage) return [3 /*break*/, 3];
                    return [4 /*yield*/, session.prompt(initialMessage, { images: initialImages })];
                case 2:
                    _d.sent();
                    _d.label = 3;
                case 3:
                    _i = 0, messages_1 = messages;
                    _d.label = 4;
                case 4:
                    if (!(_i < messages_1.length)) return [3 /*break*/, 7];
                    message = messages_1[_i];
                    return [4 /*yield*/, session.prompt(message)];
                case 5:
                    _d.sent();
                    _d.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7:
                    // In text mode, output final response
                    if (mode === "text") {
                        state = session.state;
                        lastMessage = state.messages[state.messages.length - 1];
                        if ((lastMessage === null || lastMessage === void 0 ? void 0 : lastMessage.role) === "assistant") {
                            assistantMsg = lastMessage;
                            // Check for error/aborted
                            if (assistantMsg.stopReason === "error" || assistantMsg.stopReason === "aborted") {
                                console.error(assistantMsg.errorMessage || "Request ".concat(assistantMsg.stopReason));
                                process.exit(1);
                            }
                            // Output text content
                            for (_b = 0, _c = assistantMsg.content; _b < _c.length; _b++) {
                                content = _c[_b];
                                if (content.type === "text") {
                                    console.log(content.text);
                                }
                            }
                        }
                    }
                    // Ensure stdout is fully flushed before returning
                    // This prevents race conditions where the process exits before all output is written
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            process.stdout.write("", function (err) {
                                if (err)
                                    reject(err);
                                else
                                    resolve();
                            });
                        })];
                case 8:
                    // Ensure stdout is fully flushed before returning
                    // This prevents race conditions where the process exits before all output is written
                    _d.sent();
                    return [2 /*return*/];
            }
        });
    });
}
