import { Router } from 'express';
import {db, pgp} from "../lib/db.js";

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

usersRouter.post('/block' , async (req, res) => {
  if (!db) return res.status(500).json({ ok: false, message: 'Database is not configured' });
  const idsRaw = req.body?.ids;
  if (!Array.isArray(idsRaw) || idsRaw.length === 0 || !idsRaw.every((x) => Number.isInteger(x) && x > 0)) {
    return res.status(400).json({ ok: false, message: 'ids must be number[] of positive integers' });
  }
  const ids = Array.from(new Set(idsRaw as number[]));
  if (ids.length === 0) return res.status(400).json({ ok: false, message: 'ids[] is required' });

  const q = `UPDATE users SET is_blocked = TRUE WHERE id IN (${pgp.as.csv(ids)})`;
  const result = await db.result(q);
  return res.status(200).json({ ok: true, message: 'Users blocked', updatedCount: result.rowCount });
});

usersRouter.post('/unblock', async (req, res) => {
  if (!db) return res.status(500).json({ ok: false, message: 'Database is not configured' });
  const idsRaw = req.body?.ids;
  if (!Array.isArray(idsRaw) || idsRaw.length === 0 || !idsRaw.every((x) => Number.isInteger(x) && x > 0)) {
    return res.status(400).json({ ok: false, message: 'ids must be number[] of positive integers' });
  }
  const ids = Array.from(new Set(idsRaw as number[]));
  if (ids.length === 0) return res.status(400).json({ ok: false, message: 'ids[] is required' });

  const q = `UPDATE users SET is_blocked = FALSE WHERE id IN (${pgp.as.csv(ids)})`;
  const result = await db.result(q);
  return res.status(200).json({ ok: true, message: 'Users unblocked', updatedCount: result.rowCount });
});

usersRouter.delete('/delete', async (req, res) => {
  if (!db) return res.status(500).json({ ok: false, message: 'Database is not configured' });
  const idsRaw = req.body?.ids;
  if (!Array.isArray(idsRaw) || idsRaw.length === 0 || !idsRaw.every((x) => Number.isInteger(x) && x > 0)) {
    return res.status(400).json({ ok: false, message: 'ids must be number[] of positive integers' });
  }
  const ids = Array.from(new Set(idsRaw as number[]));
  if (ids.length === 0) return res.status(400).json({ ok: false, message: 'ids[] is required' });

  const q = `DELETE FROM users WHERE id IN (${pgp.as.csv(ids)})`;
  const result = await db.result(q);
  return res.status(200).json({ ok: true, message: 'Users deleted', deletedCount: result.rowCount });
});

usersRouter.delete('/delete-unverified', async (_req, res) => {
  if (!db) return res.status(500).json({ ok: false, message: 'Database is not configured' });
  const result = await db.result('DELETE FROM users WHERE email_verified = FALSE');
  return res.status(200).json({ ok: true, message: 'Unverified users deleted', deletedCount: result.rowCount });
});

usersRouter.delete('/delete-all', async (_req, res) => {
  if (!db) {
    return res.status(500).json({
      ok: false,
      message: 'Database is not configured',
    });
  }

  try {
    const result = await db.result('DELETE FROM users');
    return res.status(200).json({
      ok: true,
      message: 'All users deleted',
      deletedCount: result.rowCount,
    });
  } catch (error: unknown) {
    console.error('Failed to delete all users:', error);
    return res.status(500).json({
      ok: false,
      message: 'Failed to delete all users',
    });
  }
});
