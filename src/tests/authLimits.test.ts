import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { 
  checkLoginRateLimit, 
  recordFailedLogin, 
  recordSuccessfulLogin 
} from '../lib/authLimits';

function cleanTestLimits() {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dataDir = isVercel 
    ? path.join(os.tmpdir(), 'ticky-notes-data')
    : path.join(process.cwd(), 'data');
  const filePath = path.join(dataDir, 'auth_limits.json');
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {}
  }
}

test('Auth Limits — Successful Logins Rate Limiter (max 3 logins in 12 hours)', () => {
  cleanTestLimits();

  const username = 'testuser';

  // 1. Initial check
  let check = checkLoginRateLimit(username);
  assert.strictEqual(check.allowed, true);

  // 2. 1st login
  recordSuccessfulLogin(username);
  check = checkLoginRateLimit(username);
  assert.strictEqual(check.allowed, true);

  // 3. 2nd login
  recordSuccessfulLogin(username);
  check = checkLoginRateLimit(username);
  assert.strictEqual(check.allowed, true);

  // 4. 3rd login
  recordSuccessfulLogin(username);
  
  // 5. 4th login attempt should be blocked
  check = checkLoginRateLimit(username);
  assert.strictEqual(check.allowed, false);
  assert.match(check.reason || '', /Successful login limit reached/);

  cleanTestLimits();
});

test('Auth Limits — Incorrect PIN Account Lockout (lock for 2 days on 2 failures)', () => {
  cleanTestLimits();

  const username = 'lockuser';

  // 1. 1st failure — should still be allowed
  recordFailedLogin(username);
  let check = checkLoginRateLimit(username);
  assert.strictEqual(check.allowed, true);

  // 2. 2nd failure — should be locked
  recordFailedLogin(username);
  check = checkLoginRateLimit(username);
  assert.strictEqual(check.allowed, false);
  assert.match(check.reason || '', /Account locked due to 2 incorrect PIN attempts/);
  assert.strictEqual(check.lockType, 'failed');

  cleanTestLimits();
});
