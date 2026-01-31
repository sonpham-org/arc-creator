import crypto from 'crypto';

/**
 * Hash an admin key using SHA-256
 */
export function hashAdminKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Verify an admin key against the stored hash
 */
export function verifyAdminKey(providedKey: string): boolean {
  const storedHash = process.env.ADMIN_SECRET_HASH;
  
  if (!storedHash) {
    console.warn('ADMIN_SECRET_HASH not configured - admin features disabled');
    return false;
  }
  
  const providedHash = hashAdminKey(providedKey);
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(storedHash, 'hex'),
      Buffer.from(providedHash, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Generate a secure random admin key
 */
export function generateAdminKey(): string {
  return crypto.randomBytes(32).toString('base64url');
}
