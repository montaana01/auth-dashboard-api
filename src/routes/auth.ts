import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { config } from '../config.ts';
import { db } from '../lib/db.ts';
import {
  createEmailVerificationToken,
  verifyEmailVerificationToken,
} from '../lib/verification.ts';
import { sendEmailVerificationMail } from '../lib/nodemailer.ts';
import { createSessionToken, hashToken } from "../lib/session.js";
import { authMiddleware } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.get('/me', authMiddleware, (_req, res) => {
  const auth = res.locals.auth;
  return res.status(200).json({
    ok: true,
    user: {
      id: auth.user.id,
      email: auth.user.email,
      emailVerified: auth.user.emailVerified,
      isBlocked: auth.user.isBlocked,
      lastLoginAt: auth.user.lastLoginAt,
    },
    session: auth.session,
  });
});

authRouter.post('/sign-up', async (req, res) => {
  let { email, password } = req.body ?? {};
  if (email) email = email.trim().toLowerCase();
  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    email.trim().length === 0 ||
    password.length === 0
  ) {
    return res.status(400).json({
      ok: false,
      message: 'Invalid request body. Expected non-empty email and password',
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);
    if (!db) {
      return res.status(500).json({
        ok: false,
        message: 'Something went wrong with PostgreSQL!',
      });
    }
    const user = await db.one<{
      id: number;
      email: string;
      created_at: string;
      is_blocked: boolean;
      email_verified: boolean;
    }>(
      `
      INSERT INTO users (email, password_hash, is_blocked, email_verified)
      VALUES ($1, $2, FALSE, FALSE)
      RETURNING id, email, created_at, is_blocked, email_verified
    `,
      [email, passwordHash],
    );

    const verificationToken = createEmailVerificationToken(user.id, user.email);
    const verificationLink =
      `${config.applicationBaseUrl}/auth/verify-email?token=` + encodeURIComponent(verificationToken);

    sendEmailVerificationMail(user.email, verificationLink)
      .catch((error) => {
        console.error('Failed to send verification email:', error);
      });

    return res.status(201).json({
      ok: true,
      message: 'User registered. Verification email has been sent.',
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        isBlocked: user.is_blocked,
        emailVerified: user.email_verified,
      },
    });
  } catch (error) {
    const dbError = error as { code?: string };
    if (dbError.code === '23505') {
      return res.status(409).json({
        ok: false,
        message: 'User with this email already exists',
      });
    }

    return res.status(500).json({
      ok: false,
      message: 'Registration failed',
    });
  }
});

authRouter.post('/sign-in', async (req, res) => {
  let { email, password } = req.body ?? {};
  if (email) email = email.trim().toLowerCase();
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ ok: false, message: 'Invalid request body. Expected non-empty email and password' });
  }
  if (!db) return res.status(500).json({ ok: false, message: 'Database is not configured' });

  const user = await db.oneOrNone<{
    id: number; email: string; password_hash: string; is_blocked: boolean; email_verified: boolean;
  }>(
    `select id, email, password_hash, is_blocked, email_verified
     from users
     where lower(email) = lower($1)
     limit 1`,
    [email]
  );

  if (!user) return res.status(401).json({ ok: false, message: 'Invalid email or password' });
  if (user.is_blocked) return res.status(403).json({ ok: false, message: 'User is blocked' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ ok: false, message: 'Invalid email or password' });

  const token = createSessionToken();
  const tokenHash = hashToken(token);

  const sessionTtlDays = config.sessionTtlDays;
  const session = await db.one<{ id: number; expires_at: string }>(
    `insert into sessions(user_id, token_hash, expires_at)
     values($1, $2, now() + ($3 || ' days')::interval)
     returning id, expires_at`,
    [user.id, tokenHash, String(sessionTtlDays)]
  );

  await db.none('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'none',
    secure: config.cookieSecure,
    maxAge: sessionTtlDays * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    ok: true,
    message: 'Signed in',
    user: { id: user.id, email: user.email, emailVerified: user.email_verified },
    session: { id: session.id, expiresAt: session.expires_at },
  });
});

authRouter.post('/logout', authMiddleware, async (_req, res) => {
  if (!db) return res.status(500).json({ ok: false, message: 'Database is not configured' });
  const auth = res.locals.auth;
  await db.none('UPDATE sessions SET revoked_at = now() WHERE id = $1', [auth.session.id]);
  res.clearCookie(config.cookieName);
  return res.status(200).json({ ok: true, message: 'Logged out' });
});

authRouter.get('/verify-email', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    return res.status(400).json({
      ok: false,
      message: 'Verification token is required',
    });
  }

  if (!db) {
    return res.status(500).json({
      ok: false,
      message: 'Something went wrong with PostgreSQL!',
    });
  }

  const payload = verifyEmailVerificationToken(token);
  if (!payload) {
    return res.status(400).json({
      ok: false,
      message: 'Invalid or expired verification token',
    });
  }

  try {
    const updated = await db.oneOrNone<{ id: number }>(
      `
      UPDATE users
      SET email_verified = TRUE
      WHERE id = $1
        AND lower(email) = lower($2)
        AND email_verified = FALSE
      RETURNING id
      `,
      [payload.userId, payload.email],
    );

    if (!updated) {
      return res.status(404).json({
        ok: false,
        message: 'User not found for this token',
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Email has been verified successfully',
    });
  } catch (error: unknown) {
    console.error('Email verification failed:', error);
    return res.status(500).json({
      ok: false,
      message: 'Email verification failed',
    });
  }
});
