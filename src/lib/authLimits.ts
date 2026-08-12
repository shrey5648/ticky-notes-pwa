import fs from 'fs';
import path from 'path';
import os from 'os';

export interface UserAuthLimit {
  failedAttempts: number;
  lockedUntil: number; // timestamp
  successfulLogins: number[]; // array of timestamps
}

const getLimitsFilePath = () => {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dataDir = isVercel 
    ? path.join(os.tmpdir(), 'ticky-notes-data')
    : path.join(process.cwd(), 'data');
  
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch (e) {}
  }
  return path.join(dataDir, 'auth_limits.json');
};

export const readAuthLimits = (): Record<string, UserAuthLimit> => {
  try {
    const filePath = getLimitsFilePath();
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading auth limits:', e);
  }
  return {};
};

export const writeAuthLimits = (limits: Record<string, UserAuthLimit>) => {
  try {
    const filePath = getLimitsFilePath();
    fs.writeFileSync(filePath, JSON.stringify(limits, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing auth limits:', e);
  }
};

export function checkLoginRateLimit(username: string): { 
  allowed: boolean; 
  reason?: string; 
  lockType?: 'failed' | 'success';
  retryAfterSeconds?: number;
} {
  const limits = readAuthLimits();
  const userLimit = limits[username];
  if (!userLimit) return { allowed: true };

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
    } else {
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

export function recordFailedLogin(username: string) {
  const limits = readAuthLimits();
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

  writeAuthLimits(limits);
}

export function recordSuccessfulLogin(username: string) {
  const limits = readAuthLimits();
  const now = Date.now();
  if (!limits[username]) {
    limits[username] = { failedAttempts: 0, lockedUntil: 0, successfulLogins: [] };
  }

  const userLimit = limits[username];
  userLimit.failedAttempts = 0;
  userLimit.lockedUntil = 0;
  
  // Record login timestamp
  userLimit.successfulLogins = [...(userLimit.successfulLogins || []).filter(t => t > now - 12 * 60 * 60 * 1000), now];
  
  writeAuthLimits(limits);
}
