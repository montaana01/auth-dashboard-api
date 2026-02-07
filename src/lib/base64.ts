export const encodeBase64 = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');
export const decodeBase64 = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');
