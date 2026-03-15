"use strict";
/**
 * List available models with optional fuzzy search
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
exports.listModels = listModels;
var pi_tui_1 = require("@mariozechner/pi-tui");
/**
 * Format a number as human-readable (e.g., 200000 -> "200K", 1000000 -> "1M")
 */
function formatTokenCount(count) {
    if (count >= 1000000) {
        var millions = count / 1000000;
        return millions % 1 === 0 ? "".concat(millions, "M") : "".concat(millions.toFixed(1), "M");
    }
    if (count >= 1000) {
        var thousands = count / 1000;
        return thousands % 1 === 0 ? "".concat(thousands, "K") : "".concat(thousands.toFixed(1), "K");
    }
    return count.toString();
}
/**
 * List available models, optionally filtered by search pattern
 */
function listModels(modelRegistry, searchPattern) {
    return __awaiter(this, void 0, void 0, function () {
        var models, filteredModels, rows, headers, widths, headerLine, _i, rows_1, row, line;
        return __generator(this, function (_a) {
            models = modelRegistry.getAvailable();
            if (models.length === 0) {
                console.log("No models available. Set API keys in environment variables.");
                return [2 /*return*/];
            }
            filteredModels = models;
            if (searchPattern) {
                filteredModels = (0, pi_tui_1.fuzzyFilter)(models, searchPattern, function (m) { return "".concat(m.provider, " ").concat(m.id); });
            }
            if (filteredModels.length === 0) {
                console.log("No models matching \"".concat(searchPattern, "\""));
                return [2 /*return*/];
            }
            // Sort by provider, then by model id
            filteredModels.sort(function (a, b) {
                var providerCmp = a.provider.localeCompare(b.provider);
                if (providerCmp !== 0)
                    return providerCmp;
                return a.id.localeCompare(b.id);
            });
            rows = filteredModels.map(function (m) { return ({
                provider: m.provider,
                model: m.id,
                context: formatTokenCount(m.contextWindow),
                maxOut: formatTokenCount(m.maxTokens),
                thinking: m.reasoning ? "yes" : "no",
                images: m.input.includes("image") ? "yes" : "no",
            }); });
            headers = {
                provider: "provider",
                model: "model",
                context: "context",
                maxOut: "max-out",
                thinking: "thinking",
                images: "images",
            };
            widths = {
                provider: Math.max.apply(Math, __spreadArray([headers.provider.length], rows.map(function (r) { return r.provider.length; }), false)),
                model: Math.max.apply(Math, __spreadArray([headers.model.length], rows.map(function (r) { return r.model.length; }), false)),
                context: Math.max.apply(Math, __spreadArray([headers.context.length], rows.map(function (r) { return r.context.length; }), false)),
                maxOut: Math.max.apply(Math, __spreadArray([headers.maxOut.length], rows.map(function (r) { return r.maxOut.length; }), false)),
                thinking: Math.max.apply(Math, __spreadArray([headers.thinking.length], rows.map(function (r) { return r.thinking.length; }), false)),
                images: Math.max.apply(Math, __spreadArray([headers.images.length], rows.map(function (r) { return r.images.length; }), false)),
            };
            headerLine = [
                headers.provider.padEnd(widths.provider),
                headers.model.padEnd(widths.model),
                headers.context.padEnd(widths.context),
                headers.maxOut.padEnd(widths.maxOut),
                headers.thinking.padEnd(widths.thinking),
                headers.images.padEnd(widths.images),
            ].join("  ");
            console.log(headerLine);
            // Print rows
            for (_i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
                row = rows_1[_i];
                line = [
                    row.provider.padEnd(widths.provider),
                    row.model.padEnd(widths.model),
                    row.context.padEnd(widths.context),
                    row.maxOut.padEnd(widths.maxOut),
                    row.thinking.padEnd(widths.thinking),
                    row.images.padEnd(widths.images),
                ].join("  ");
                console.log(line);
            }
            return [2 /*return*/];
        });
    });
}
