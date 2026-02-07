import nodemailer from 'nodemailer';
import { config } from '../config.ts';

const hasSmtpConfig = Boolean(config.smtpHost && config.smtpPort && config.smtpFrom);

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpSecure,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  }
});

export const pingSmtp = async (): Promise<{ connected: boolean; details: string }> => {
  if (!hasSmtpConfig) {
    return {
      connected: false,
      details: 'SMTP is not configured',
    };
  }

  await transporter.verify();
  return {
    connected: true,
    details: `SMTP connection is healthy (${config.smtpHost}:${config.smtpPort})`,
  };
};

export const sendEmailVerificationMail = async (email: string, verificationLink: string): Promise<void> => {
  await transporter.sendMail({
    from: config.smtpFrom,
    to: email,
    subject: 'Confirm your email at Auth Dashboard',
    text: `Please confirm your email by opening this link: ${verificationLink}`,
    html: `<p>Please confirm your email by clicking <a href="${verificationLink}">this link</a>.</p>`,
  });
};
