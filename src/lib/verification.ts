import crypto from 'node:crypto';
import { config } from '../config.ts';
import { VerificationPayload } from "../types/verificationTypes.js";
import { encodeBase64, decodeBase64 } from "../helpers/base64.js";

const sign = (payload: string): string =>
  crypto.createHmac('sha256', config.emailVerificationSecret).update(payload).digest('base64url');

export const createEmailVerificationToken = (userId: number, email: string): string => {
  const expire = Date.now() + config.emailVerificationTtlMinutes * 60 * 1000;
  const payload: VerificationPayload = { userId, email, expire };
  const encoded = encodeBase64(JSON.stringify(payload));
  const signature = sign(encoded);

  return `${encoded}.${signature}`;
};

export const verifyEmailVerificationToken = (token: string): VerificationPayload | null => {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) {
    return null;
  }

  const expected = sign(encoded);

  const sigBuffer = Buffer.from(signature, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');
  if (sigBuffer.length !== expectedBuffer.length) {
    return null;
  }

  const isValidSignature = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  if (!isValidSignature) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64(encoded)) as VerificationPayload;

    if (Date.now() > parsed.expire) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};
