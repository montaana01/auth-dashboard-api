import 'dotenv/config';

const postgresUri =
  process.env.NF_AUTH_DASHBOARD_POSTGRES_URI ||
  process.env.EXTERNAL_POSTGRES_URI ||
  process.env.POSTGRES_URI;

export const config = {
  port: Number(process.env.PORT || 3000),
  postgresUri,
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: Boolean(process.env.SMTP_SECURE === 'true'),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT || 10),
  emailVerificationSecret: process.env.EMAIL_SECRET || 'change-me-before-use',
  emailVerificationTtlMinutes: Number(process.env.EMAIL_TTL || 1440) * 60 * 24,
  applicationBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost',
  cookieName: process.env.SESSION_COOKIE_NAME || 'session',
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS || 30),
  cookieSecure: Boolean(process.env.COOKIE_SECURE === 'true'),
};
