"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeJsonLine = serializeJsonLine;
exports.attachJsonlLineReader = attachJsonlLineReader;
var node_string_decoder_1 = require("node:string_decoder");
/**
 * Serialize a single strict JSONL record.
 *
 * Framing is LF-only. Payload strings may contain other Unicode separators such as
 * U+2028 and U+2029. Clients must split records on `\n` only.
 */
function serializeJsonLine(value) {
    return "".concat(JSON.stringify(value), "\n");
}
/**
 * Attach an LF-only JSONL reader to a stream.
 *
 * This intentionally does not use Node readline. Readline splits on additional
 * Unicode separators that are valid inside JSON strings and therefore does not
 * implement strict JSONL framing.
 */
function attachJsonlLineReader(stream, onLine) {
    var decoder = new node_string_decoder_1.StringDecoder("utf8");
    var buffer = "";
    var emitLine = function (line) {
        onLine(line.endsWith("\r") ? line.slice(0, -1) : line);
    };
    var onData = function (chunk) {
        buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);
        while (true) {
            var newlineIndex = buffer.indexOf("\n");
            if (newlineIndex === -1) {
                return;
            }
            emitLine(buffer.slice(0, newlineIndex));
            buffer = buffer.slice(newlineIndex + 1);
        }
    };
    var onEnd = function () {
        buffer += decoder.end();
        if (buffer.length > 0) {
            emitLine(buffer);
            buffer = "";
        }
    };
    stream.on("data", onData);
    stream.on("end", onEnd);
    return function () {
        stream.off("data", onData);
        stream.off("end", onEnd);
    };
}
