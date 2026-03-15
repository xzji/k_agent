"use strict";
/**
 * Shared command execution utilities for extensions and custom tools.
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
exports.execCommand = execCommand;
var node_child_process_1 = require("node:child_process");
/**
 * Execute a shell command and return stdout/stderr/code.
 * Supports timeout and abort signal.
 */
function execCommand(command, args, cwd, options) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    var _a, _b;
                    var proc = (0, node_child_process_1.spawn)(command, args, {
                        cwd: cwd,
                        shell: false,
                        stdio: ["ignore", "pipe", "pipe"],
                    });
                    var stdout = "";
                    var stderr = "";
                    var killed = false;
                    var timeoutId;
                    var killProcess = function () {
                        if (!killed) {
                            killed = true;
                            proc.kill("SIGTERM");
                            // Force kill after 5 seconds if SIGTERM doesn't work
                            setTimeout(function () {
                                if (!proc.killed) {
                                    proc.kill("SIGKILL");
                                }
                            }, 5000);
                        }
                    };
                    // Handle abort signal
                    if (options === null || options === void 0 ? void 0 : options.signal) {
                        if (options.signal.aborted) {
                            killProcess();
                        }
                        else {
                            options.signal.addEventListener("abort", killProcess, { once: true });
                        }
                    }
                    // Handle timeout
                    if ((options === null || options === void 0 ? void 0 : options.timeout) && options.timeout > 0) {
                        timeoutId = setTimeout(function () {
                            killProcess();
                        }, options.timeout);
                    }
                    (_a = proc.stdout) === null || _a === void 0 ? void 0 : _a.on("data", function (data) {
                        stdout += data.toString();
                    });
                    (_b = proc.stderr) === null || _b === void 0 ? void 0 : _b.on("data", function (data) {
                        stderr += data.toString();
                    });
                    proc.on("close", function (code) {
                        if (timeoutId)
                            clearTimeout(timeoutId);
                        if (options === null || options === void 0 ? void 0 : options.signal) {
                            options.signal.removeEventListener("abort", killProcess);
                        }
                        resolve({ stdout: stdout, stderr: stderr, code: code !== null && code !== void 0 ? code : 0, killed: killed });
                    });
                    proc.on("error", function (_err) {
                        if (timeoutId)
                            clearTimeout(timeoutId);
                        if (options === null || options === void 0 ? void 0 : options.signal) {
                            options.signal.removeEventListener("abort", killProcess);
                        }
                        resolve({ stdout: stdout, stderr: stderr, code: 1, killed: killed });
                    });
                })];
        });
    });
}
