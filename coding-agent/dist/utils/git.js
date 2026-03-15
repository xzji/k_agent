"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGitUrl = parseGitUrl;
var hosted_git_info_1 = require("hosted-git-info");
function splitRef(url) {
    var _a, _b;
    var scpLikeMatch = url.match(/^git@([^:]+):(.+)$/);
    if (scpLikeMatch) {
        var pathWithMaybeRef_1 = (_a = scpLikeMatch[2]) !== null && _a !== void 0 ? _a : "";
        var refSeparator_1 = pathWithMaybeRef_1.indexOf("@");
        if (refSeparator_1 < 0)
            return { repo: url };
        var repoPath_1 = pathWithMaybeRef_1.slice(0, refSeparator_1);
        var ref_1 = pathWithMaybeRef_1.slice(refSeparator_1 + 1);
        if (!repoPath_1 || !ref_1)
            return { repo: url };
        return {
            repo: "git@".concat((_b = scpLikeMatch[1]) !== null && _b !== void 0 ? _b : "", ":").concat(repoPath_1),
            ref: ref_1,
        };
    }
    if (url.includes("://")) {
        try {
            var parsed = new URL(url);
            var pathWithMaybeRef_2 = parsed.pathname.replace(/^\/+/, "");
            var refSeparator_2 = pathWithMaybeRef_2.indexOf("@");
            if (refSeparator_2 < 0)
                return { repo: url };
            var repoPath_2 = pathWithMaybeRef_2.slice(0, refSeparator_2);
            var ref_2 = pathWithMaybeRef_2.slice(refSeparator_2 + 1);
            if (!repoPath_2 || !ref_2)
                return { repo: url };
            parsed.pathname = "/".concat(repoPath_2);
            return {
                repo: parsed.toString().replace(/\/$/, ""),
                ref: ref_2,
            };
        }
        catch (_c) {
            return { repo: url };
        }
    }
    var slashIndex = url.indexOf("/");
    if (slashIndex < 0) {
        return { repo: url };
    }
    var host = url.slice(0, slashIndex);
    var pathWithMaybeRef = url.slice(slashIndex + 1);
    var refSeparator = pathWithMaybeRef.indexOf("@");
    if (refSeparator < 0) {
        return { repo: url };
    }
    var repoPath = pathWithMaybeRef.slice(0, refSeparator);
    var ref = pathWithMaybeRef.slice(refSeparator + 1);
    if (!repoPath || !ref) {
        return { repo: url };
    }
    return {
        repo: "".concat(host, "/").concat(repoPath),
        ref: ref,
    };
}
function parseGenericGitUrl(url) {
    var _a, _b;
    var _c = splitRef(url), repoWithoutRef = _c.repo, ref = _c.ref;
    var repo = repoWithoutRef;
    var host = "";
    var path = "";
    var scpLikeMatch = repoWithoutRef.match(/^git@([^:]+):(.+)$/);
    if (scpLikeMatch) {
        host = (_a = scpLikeMatch[1]) !== null && _a !== void 0 ? _a : "";
        path = (_b = scpLikeMatch[2]) !== null && _b !== void 0 ? _b : "";
    }
    else if (repoWithoutRef.startsWith("https://") ||
        repoWithoutRef.startsWith("http://") ||
        repoWithoutRef.startsWith("ssh://") ||
        repoWithoutRef.startsWith("git://")) {
        try {
            var parsed = new URL(repoWithoutRef);
            host = parsed.hostname;
            path = parsed.pathname.replace(/^\/+/, "");
        }
        catch (_d) {
            return null;
        }
    }
    else {
        var slashIndex = repoWithoutRef.indexOf("/");
        if (slashIndex < 0) {
            return null;
        }
        host = repoWithoutRef.slice(0, slashIndex);
        path = repoWithoutRef.slice(slashIndex + 1);
        if (!host.includes(".") && host !== "localhost") {
            return null;
        }
        repo = "https://".concat(repoWithoutRef);
    }
    var normalizedPath = path.replace(/\.git$/, "").replace(/^\/+/, "");
    if (!host || !normalizedPath || normalizedPath.split("/").length < 2) {
        return null;
    }
    return {
        type: "git",
        repo: repo,
        host: host,
        path: normalizedPath,
        ref: ref,
        pinned: Boolean(ref),
    };
}
/**
 * Parse git source into a GitSource.
 *
 * Rules:
 * - With git: prefix, accept all historical shorthand forms.
 * - Without git: prefix, only accept explicit protocol URLs.
 */
function parseGitUrl(source) {
    var _a, _b;
    var trimmed = source.trim();
    var hasGitPrefix = trimmed.startsWith("git:");
    var url = hasGitPrefix ? trimmed.slice(4).trim() : trimmed;
    if (!hasGitPrefix && !/^(https?|ssh|git):\/\//i.test(url)) {
        return null;
    }
    var split = splitRef(url);
    var hostedCandidates = [split.ref ? "".concat(split.repo, "#").concat(split.ref) : undefined, url].filter(function (value) { return Boolean(value); });
    for (var _i = 0, hostedCandidates_1 = hostedCandidates; _i < hostedCandidates_1.length; _i++) {
        var candidate = hostedCandidates_1[_i];
        var info = hosted_git_info_1.default.fromUrl(candidate);
        if (info) {
            if (split.ref && ((_a = info.project) === null || _a === void 0 ? void 0 : _a.includes("@"))) {
                continue;
            }
            var useHttpsPrefix = !split.repo.startsWith("http://") &&
                !split.repo.startsWith("https://") &&
                !split.repo.startsWith("ssh://") &&
                !split.repo.startsWith("git://") &&
                !split.repo.startsWith("git@");
            return {
                type: "git",
                repo: useHttpsPrefix ? "https://".concat(split.repo) : split.repo,
                host: info.domain || "",
                path: "".concat(info.user, "/").concat(info.project).replace(/\.git$/, ""),
                ref: info.committish || split.ref || undefined,
                pinned: Boolean(info.committish || split.ref),
            };
        }
    }
    var httpsCandidates = [split.ref ? "https://".concat(split.repo, "#").concat(split.ref) : undefined, "https://".concat(url)].filter(function (value) { return Boolean(value); });
    for (var _c = 0, httpsCandidates_1 = httpsCandidates; _c < httpsCandidates_1.length; _c++) {
        var candidate = httpsCandidates_1[_c];
        var info = hosted_git_info_1.default.fromUrl(candidate);
        if (info) {
            if (split.ref && ((_b = info.project) === null || _b === void 0 ? void 0 : _b.includes("@"))) {
                continue;
            }
            return {
                type: "git",
                repo: "https://".concat(split.repo),
                host: info.domain || "",
                path: "".concat(info.user, "/").concat(info.project).replace(/\.git$/, ""),
                ref: info.committish || split.ref || undefined,
                pinned: Boolean(info.committish || split.ref),
            };
        }
    }
    return parseGenericGitUrl(url);
}
