"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuthLimits = exports.readAuthLimits = void 0;
exports.checkLoginRateLimit = checkLoginRateLimit;
exports.recordFailedLogin = recordFailedLogin;
exports.recordSuccessfulLogin = recordSuccessfulLogin;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const getLimitsFilePath = () => {
    const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const dataDir = isVercel
        ? path_1.default.join(os_1.default.tmpdir(), 'ticky-notes-data')
        : path_1.default.join(process.cwd(), 'data');
    if (!fs_1.default.existsSync(dataDir)) {
        try {
            fs_1.default.mkdirSync(dataDir, { recursive: true });
        }
        catch (e) { }
    }
    return path_1.default.join(dataDir, 'auth_limits.json');
};
const readAuthLimits = () => {
    try {
        const filePath = getLimitsFilePath();
        if (fs_1.default.existsSync(filePath)) {
            return JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
        }
    }
    catch (e) {
        console.error('Error reading auth limits:', e);
    }
    return {};
};
exports.readAuthLimits = readAuthLimits;
const writeAuthLimits = (limits) => {
    try {
        const filePath = getLimitsFilePath();
        fs_1.default.writeFileSync(filePath, JSON.stringify(limits, null, 2), 'utf-8');
    }
    catch (e) {
        console.error('Error writing auth limits:', e);
    }
};
exports.writeAuthLimits = writeAuthLimits;
function checkLoginRateLimit(username) {
    const limits = (0, exports.readAuthLimits)();
    const userLimit = limits[username];
    if (!userLimit)
        return { allowed: true };
    const now = Date.now();
    // 1. Check wrong PIN lockout (2 wrong PINs = 2 days block)
    if (userLimit.lockedUntil > now) {
        const retryAfterSeconds = Math.ceil((userLimit.lockedUntil - now) / 1000);
        const days = Math.ceil(retryAfterSeconds / (24 * 3600));
        const hours = Math.ceil(retryAfterSeconds / 3600);
        const reason = hours > 24
            ? `Account locked due to 2 incorrect PIN attempts. Try again in ${days} days.`
            : `Account locked due to 2 incorrect PIN attempts. Try again in ${hours} hours.`;
        return {
            allowed: false,
            reason,
            lockType: 'failed',
            retryAfterSeconds
        };
    }
    // 2. Check successful login rate limit (3 logins in 12 hours)
    const twelveHoursAgo = now - 12 * 60 * 60 * 1000;
    const recentLogins = (userLimit.successfulLogins || []).filter(t => t > twelveHoursAgo);
    if (recentLogins.length >= 3) {
        const oldestLogin = Math.min(...recentLogins);
        const expiresAt = oldestLogin + 12 * 60 * 60 * 1000;
        const retryAfterSeconds = Math.ceil((expiresAt - now) / 1000);
        let timeString = '';
        if (retryAfterSeconds > 3600) {
            timeString = `${Math.ceil(retryAfterSeconds / 3600)} hours`;
        }
        else {
            timeString = `${Math.ceil(retryAfterSeconds / 60)} minutes`;
        }
        return {
            allowed: false,
            reason: `Successful login limit reached (max 3 logins per 12 hours). Try again in ${timeString}.`,
            lockType: 'success',
            retryAfterSeconds
        };
    }
    return { allowed: true };
}
function recordFailedLogin(username) {
    const limits = (0, exports.readAuthLimits)();
    const now = Date.now();
    if (!limits[username]) {
        limits[username] = { failedAttempts: 0, lockedUntil: 0, successfulLogins: [] };
    }
    const userLimit = limits[username];
    userLimit.failedAttempts++;
    if (userLimit.failedAttempts >= 2) {
        // lock for 2 days (48 hours)
        userLimit.lockedUntil = now + 2 * 24 * 60 * 60 * 1000;
        userLimit.failedAttempts = 0;
    }
    (0, exports.writeAuthLimits)(limits);
}
function recordSuccessfulLogin(username) {
    const limits = (0, exports.readAuthLimits)();
    const now = Date.now();
    if (!limits[username]) {
        limits[username] = { failedAttempts: 0, lockedUntil: 0, successfulLogins: [] };
    }
    const userLimit = limits[username];
    userLimit.failedAttempts = 0;
    userLimit.lockedUntil = 0;
    // Record login timestamp
    userLimit.successfulLogins = [...(userLimit.successfulLogins || []).filter(t => t > now - 12 * 60 * 60 * 1000), now];
    (0, exports.writeAuthLimits)(limits);
}
