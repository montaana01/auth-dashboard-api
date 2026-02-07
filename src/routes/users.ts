import { Router } from 'express';
import { db } from "../lib/db.js";

export const usersRouter = Router();

usersRouter.post('/get-table', async (req, res) => {
  if (!db) {
    return res.status(500).json({ ok: false, message: 'Database is not configured' });
  }

  const limit = Number(req.body?.limit || 100);
  const offset = Number(req.body?.offset || 0);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100;
  const safeOffset = Number.isFinite(offset) ? Math.max(offset, 0) : 0;

  const rows = await db.manyOrNone<{
    id: number;
    email: string;
    created_at: string;
    is_blocked: boolean;
    email_verified: boolean;
    last_login_at: string | null;
  }>(
    `
    SELECT id, email, created_at, is_blocked, email_verified, last_login_at
    FROM users
    ORDER BY last_login_at DESC NULLS LAST, created_at DESC
    LIMIT $1 OFFSET $2
    `,
    [safeLimit, safeOffset],
  );

  const data = rows.map((u) => {
    return {
      id: u.id,
      name: u.email,
      email: u.email,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
      isBlocked: u.is_blocked,
      emailVerified: u.email_verified,
    };
  });
  return res.status(200).json({ ok: true, rows: data, limit: safeLimit, offset: safeOffset });
});
