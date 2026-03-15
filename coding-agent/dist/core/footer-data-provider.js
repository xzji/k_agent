"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FooterDataProvider = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
/**
 * Find the git HEAD path by walking up from cwd.
 * Handles both regular git repos (.git is a directory) and worktrees (.git is a file).
 */
function findGitHeadPath() {
    var dir = process.cwd();
    while (true) {
        var gitPath = (0, path_1.join)(dir, ".git");
        if ((0, fs_1.existsSync)(gitPath)) {
            try {
                var stat = (0, fs_1.statSync)(gitPath);
                if (stat.isFile()) {
                    var content = (0, fs_1.readFileSync)(gitPath, "utf8").trim();
                    if (content.startsWith("gitdir: ")) {
                        var gitDir = content.slice(8);
                        var headPath = (0, path_1.resolve)(dir, gitDir, "HEAD");
                        if ((0, fs_1.existsSync)(headPath))
                            return headPath;
                    }
                }
                else if (stat.isDirectory()) {
                    var headPath = (0, path_1.join)(gitPath, "HEAD");
                    if ((0, fs_1.existsSync)(headPath))
                        return headPath;
                }
            }
            catch (_a) {
                return null;
            }
        }
        var parent_1 = (0, path_1.dirname)(dir);
        if (parent_1 === dir)
            return null;
        dir = parent_1;
    }
}
/**
 * Provides git branch and extension statuses - data not otherwise accessible to extensions.
 * Token stats, model info available via ctx.sessionManager and ctx.model.
 */
var FooterDataProvider = /** @class */ (function () {
    function FooterDataProvider() {
        this.extensionStatuses = new Map();
        this.cachedBranch = undefined;
        this.gitWatcher = null;
        this.branchChangeCallbacks = new Set();
        this.availableProviderCount = 0;
        this.setupGitWatcher();
    }
    /** Current git branch, null if not in repo, "detached" if detached HEAD */
    FooterDataProvider.prototype.getGitBranch = function () {
        if (this.cachedBranch !== undefined)
            return this.cachedBranch;
        try {
            var gitHeadPath = findGitHeadPath();
            if (!gitHeadPath) {
                this.cachedBranch = null;
                return null;
            }
            var content = (0, fs_1.readFileSync)(gitHeadPath, "utf8").trim();
            this.cachedBranch = content.startsWith("ref: refs/heads/") ? content.slice(16) : "detached";
        }
        catch (_a) {
            this.cachedBranch = null;
        }
        return this.cachedBranch;
    };
    /** Extension status texts set via ctx.ui.setStatus() */
    FooterDataProvider.prototype.getExtensionStatuses = function () {
        return this.extensionStatuses;
    };
    /** Subscribe to git branch changes. Returns unsubscribe function. */
    FooterDataProvider.prototype.onBranchChange = function (callback) {
        var _this = this;
        this.branchChangeCallbacks.add(callback);
        return function () { return _this.branchChangeCallbacks.delete(callback); };
    };
    /** Internal: set extension status */
    FooterDataProvider.prototype.setExtensionStatus = function (key, text) {
        if (text === undefined) {
            this.extensionStatuses.delete(key);
        }
        else {
            this.extensionStatuses.set(key, text);
        }
    };
    /** Internal: clear extension statuses */
    FooterDataProvider.prototype.clearExtensionStatuses = function () {
        this.extensionStatuses.clear();
    };
    /** Number of unique providers with available models (for footer display) */
    FooterDataProvider.prototype.getAvailableProviderCount = function () {
        return this.availableProviderCount;
    };
    /** Internal: update available provider count */
    FooterDataProvider.prototype.setAvailableProviderCount = function (count) {
        this.availableProviderCount = count;
    };
    /** Internal: cleanup */
    FooterDataProvider.prototype.dispose = function () {
        if (this.gitWatcher) {
            this.gitWatcher.close();
            this.gitWatcher = null;
        }
        this.branchChangeCallbacks.clear();
    };
    FooterDataProvider.prototype.setupGitWatcher = function () {
        var _this = this;
        if (this.gitWatcher) {
            this.gitWatcher.close();
            this.gitWatcher = null;
        }
        var gitHeadPath = findGitHeadPath();
        if (!gitHeadPath)
            return;
        // Watch the directory containing HEAD, not HEAD itself.
        // Git uses atomic writes (write temp, rename over HEAD), which changes the inode.
        // fs.watch on a file stops working after the inode changes.
        var gitDir = (0, path_1.dirname)(gitHeadPath);
        try {
            this.gitWatcher = (0, fs_1.watch)(gitDir, function (_eventType, filename) {
                if (filename === "HEAD") {
                    _this.cachedBranch = undefined;
                    for (var _i = 0, _a = _this.branchChangeCallbacks; _i < _a.length; _i++) {
                        var cb = _a[_i];
                        cb();
                    }
                }
            });
        }
        catch (_a) {
            // Silently fail if we can't watch
        }
    };
    return FooterDataProvider;
}());
exports.FooterDataProvider = FooterDataProvider;
