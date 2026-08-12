"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const authLimits_1 = require("../lib/authLimits");
function cleanTestLimits() {
    const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const dataDir = isVercel
        ? path_1.default.join(os_1.default.tmpdir(), 'ticky-notes-data')
        : path_1.default.join(process.cwd(), 'data');
    const filePath = path_1.default.join(dataDir, 'auth_limits.json');
    if (fs_1.default.existsSync(filePath)) {
        try {
            fs_1.default.unlinkSync(filePath);
        }
        catch (e) { }
    }
}
(0, node_test_1.default)('Auth Limits — Successful Logins Rate Limiter (max 3 logins in 12 hours)', () => {
    cleanTestLimits();
    const username = 'testuser';
    // 1. Initial check
    let check = (0, authLimits_1.checkLoginRateLimit)(username);
    node_assert_1.default.strictEqual(check.allowed, true);
    // 2. 1st login
    (0, authLimits_1.recordSuccessfulLogin)(username);
    check = (0, authLimits_1.checkLoginRateLimit)(username);
    node_assert_1.default.strictEqual(check.allowed, true);
    // 3. 2nd login
    (0, authLimits_1.recordSuccessfulLogin)(username);
    check = (0, authLimits_1.checkLoginRateLimit)(username);
    node_assert_1.default.strictEqual(check.allowed, true);
    // 4. 3rd login
    (0, authLimits_1.recordSuccessfulLogin)(username);
    // 5. 4th login attempt should be blocked
    check = (0, authLimits_1.checkLoginRateLimit)(username);
    node_assert_1.default.strictEqual(check.allowed, false);
    node_assert_1.default.match(check.reason || '', /Successful login limit reached/);
    cleanTestLimits();
});
(0, node_test_1.default)('Auth Limits — Incorrect PIN Account Lockout (lock for 2 days on 2 failures)', () => {
    cleanTestLimits();
    const username = 'lockuser';
    // 1. 1st failure — should still be allowed
    (0, authLimits_1.recordFailedLogin)(username);
    let check = (0, authLimits_1.checkLoginRateLimit)(username);
    node_assert_1.default.strictEqual(check.allowed, true);
    // 2. 2nd failure — should be locked
    (0, authLimits_1.recordFailedLogin)(username);
    check = (0, authLimits_1.checkLoginRateLimit)(username);
    node_assert_1.default.strictEqual(check.allowed, false);
    node_assert_1.default.match(check.reason || '', /Account locked due to 2 incorrect PIN attempts/);
    node_assert_1.default.strictEqual(check.lockType, 'failed');
    cleanTestLimits();
});
