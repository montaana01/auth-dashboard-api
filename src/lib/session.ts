import crypto from 'crypto';

export const createSessionToken = (): string => {
  return crypto.randomBytes(32).toString('base64url');
}

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
}
