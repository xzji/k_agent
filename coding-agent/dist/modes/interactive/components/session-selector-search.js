"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasSessionName = hasSessionName;
exports.parseSearchQuery = parseSearchQuery;
exports.matchSession = matchSession;
exports.filterAndSortSessions = filterAndSortSessions;
var pi_tui_1 = require("@mariozechner/pi-tui");
function normalizeWhitespaceLower(text) {
    return text.toLowerCase().replace(/\s+/g, " ").trim();
}
function getSessionSearchText(session) {
    var _a;
    return "".concat(session.id, " ").concat((_a = session.name) !== null && _a !== void 0 ? _a : "", " ").concat(session.allMessagesText, " ").concat(session.cwd);
}
function hasSessionName(session) {
    var _a;
    return Boolean((_a = session.name) === null || _a === void 0 ? void 0 : _a.trim());
}
function matchesNameFilter(session, filter) {
    if (filter === "all")
        return true;
    return hasSessionName(session);
}
function parseSearchQuery(query) {
    var trimmed = query.trim();
    if (!trimmed) {
        return { mode: "tokens", tokens: [], regex: null };
    }
    // Regex mode: re:<pattern>
    if (trimmed.startsWith("re:")) {
        var pattern = trimmed.slice(3).trim();
        if (!pattern) {
            return { mode: "regex", tokens: [], regex: null, error: "Empty regex" };
        }
        try {
            return { mode: "regex", tokens: [], regex: new RegExp(pattern, "i") };
        }
        catch (err) {
            var msg = err instanceof Error ? err.message : String(err);
            return { mode: "regex", tokens: [], regex: null, error: msg };
        }
    }
    // Token mode with quote support.
    // Example: foo "node cve" bar
    var tokens = [];
    var buf = "";
    var inQuote = false;
    var hadUnclosedQuote = false;
    var flush = function (kind) {
        var v = buf.trim();
        buf = "";
        if (!v)
            return;
        tokens.push({ kind: kind, value: v });
    };
    for (var i = 0; i < trimmed.length; i++) {
        var ch = trimmed[i];
        if (ch === '"') {
            if (inQuote) {
                flush("phrase");
                inQuote = false;
            }
            else {
                flush("fuzzy");
                inQuote = true;
            }
            continue;
        }
        if (!inQuote && /\s/.test(ch)) {
            flush("fuzzy");
            continue;
        }
        buf += ch;
    }
    if (inQuote) {
        hadUnclosedQuote = true;
    }
    // If quotes were unbalanced, fall back to plain whitespace tokenization.
    if (hadUnclosedQuote) {
        return {
            mode: "tokens",
            tokens: trimmed
                .split(/\s+/)
                .map(function (t) { return t.trim(); })
                .filter(function (t) { return t.length > 0; })
                .map(function (t) { return ({ kind: "fuzzy", value: t }); }),
            regex: null,
        };
    }
    flush(inQuote ? "phrase" : "fuzzy");
    return { mode: "tokens", tokens: tokens, regex: null };
}
function matchSession(session, parsed) {
    var text = getSessionSearchText(session);
    if (parsed.mode === "regex") {
        if (!parsed.regex) {
            return { matches: false, score: 0 };
        }
        var idx = text.search(parsed.regex);
        if (idx < 0)
            return { matches: false, score: 0 };
        return { matches: true, score: idx * 0.1 };
    }
    if (parsed.tokens.length === 0) {
        return { matches: true, score: 0 };
    }
    var totalScore = 0;
    var normalizedText = null;
    for (var _i = 0, _a = parsed.tokens; _i < _a.length; _i++) {
        var token = _a[_i];
        if (token.kind === "phrase") {
            if (normalizedText === null) {
                normalizedText = normalizeWhitespaceLower(text);
            }
            var phrase = normalizeWhitespaceLower(token.value);
            if (!phrase)
                continue;
            var idx = normalizedText.indexOf(phrase);
            if (idx < 0)
                return { matches: false, score: 0 };
            totalScore += idx * 0.1;
            continue;
        }
        var m = (0, pi_tui_1.fuzzyMatch)(token.value, text);
        if (!m.matches)
            return { matches: false, score: 0 };
        totalScore += m.score;
    }
    return { matches: true, score: totalScore };
}
function filterAndSortSessions(sessions, query, sortMode, nameFilter) {
    if (nameFilter === void 0) { nameFilter = "all"; }
    var nameFiltered = nameFilter === "all" ? sessions : sessions.filter(function (session) { return matchesNameFilter(session, nameFilter); });
    var trimmed = query.trim();
    if (!trimmed)
        return nameFiltered;
    var parsed = parseSearchQuery(query);
    if (parsed.error)
        return [];
    // Recent mode: filter only, keep incoming order.
    if (sortMode === "recent") {
        var filtered = [];
        for (var _i = 0, nameFiltered_1 = nameFiltered; _i < nameFiltered_1.length; _i++) {
            var s = nameFiltered_1[_i];
            var res = matchSession(s, parsed);
            if (res.matches)
                filtered.push(s);
        }
        return filtered;
    }
    // Relevance mode: sort by score, tie-break by modified desc.
    var scored = [];
    for (var _a = 0, nameFiltered_2 = nameFiltered; _a < nameFiltered_2.length; _a++) {
        var s = nameFiltered_2[_a];
        var res = matchSession(s, parsed);
        if (!res.matches)
            continue;
        scored.push({ session: s, score: res.score });
    }
    scored.sort(function (a, b) {
        if (a.score !== b.score)
            return a.score - b.score;
        return b.session.modified.getTime() - a.session.modified.getTime();
    });
    return scored.map(function (r) { return r.session; });
}
