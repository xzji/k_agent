"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripFrontmatter = exports.parseFrontmatter = void 0;
var yaml_1 = require("yaml");
var normalizeNewlines = function (value) { return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n"); };
var extractFrontmatter = function (content) {
    var normalized = normalizeNewlines(content);
    if (!normalized.startsWith("---")) {
        return { yamlString: null, body: normalized };
    }
    var endIndex = normalized.indexOf("\n---", 3);
    if (endIndex === -1) {
        return { yamlString: null, body: normalized };
    }
    return {
        yamlString: normalized.slice(4, endIndex),
        body: normalized.slice(endIndex + 4).trim(),
    };
};
var parseFrontmatter = function (content) {
    var _a = extractFrontmatter(content), yamlString = _a.yamlString, body = _a.body;
    if (!yamlString) {
        return { frontmatter: {}, body: body };
    }
    var parsed = (0, yaml_1.parse)(yamlString);
    return { frontmatter: (parsed !== null && parsed !== void 0 ? parsed : {}), body: body };
};
exports.parseFrontmatter = parseFrontmatter;
var stripFrontmatter = function (content) { return (0, exports.parseFrontmatter)(content).body; };
exports.stripFrontmatter = stripFrontmatter;
