import type {NextFunction, Request, Response} from 'express';
import {db} from '../lib/db.ts';
import {hashToken} from '../lib/session.js';
import {config} from '../config.ts';

function readSessionToken(req: Request): string {
  const cookieToken = req.cookies?.[config.cookieName];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) return cookieToken;
  return '';
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    if (!db) {
      return res.status(500).json({ ok: false, message: 'Database is not configured' });
    }

    const token = readSessionToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, message: 'Authentication required' });
    }

    const tokenHash = hashToken(token);

    const row = await db.oneOrNone<{
      session_id: number;
      session_user_id: number;
      session_expires_at: string;
      user_id: number;
      user_email: string;
      user_is_blocked: boolean;
      user_email_verified: boolean;
      user_last_login_at: string | null;
    }>(
      `
      SELECT
        s.id AS session_id,
        s.user_id AS session_user_id,
        s.expires_at AS session_expires_at,
        u.id AS user_id,
        u.email AS user_email,
        u.is_blocked AS user_is_blocked,
        u.email_verified AS user_email_verified,
        u.last_login_at AS user_last_login_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
      LIMIT 1
      `,
      [tokenHash],
    );

    if (!row) {
      return res.status(401).json({ ok: false, message: 'Invalid or expired session' });
    }

    if (row.user_is_blocked) {
      return res.status(403).json({ ok: false, message: 'User is blocked' });
    }

    await db.none(
      `
        UPDATE sessions
        SET last_seen_at = now()
        WHERE id = $1
          AND (last_seen_at IS NULL OR last_seen_at < now() - interval '1 minute')
        `,
      [row.session_id],
    );

    res.locals.auth = {
      user: {
        id: row.user_id,
        email: row.user_email,
        isBlocked: row.user_is_blocked,
        emailVerified: row.user_email_verified,
        lastLoginAt: row.user_last_login_at,
      },
      session: {
        id: row.session_id,
        userId: row.session_user_id,
        expiresAt: row.session_expires_at,
      },
    };
    return next();
  } catch (err) {
    console.error('authMiddleware failed:', err);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
}
