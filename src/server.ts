import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.ts';
import { pingDb } from './lib/db.ts';
import { pingSmtp } from './lib/nodemailer.ts';
import { authRouter } from './routes/auth.ts';
import { usersRouter } from "./routes/users.js";
import { authMiddleware } from "./middleware/auth.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'auth-dashboard-api' });
});

app.get('/check/db', async (_req, res) => {
  try {
    const status = await pingDb();
    res.status(status.connected ? 200 : 500).json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    res.status(500).json({ connected: false, details: message });
  }
});

app.get('/check/smtp', async (_req, res) => {
  try {
    const status = await pingSmtp();
    res.status(status.connected ? 200 : 500).json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown SMTP error';
    res.status(500).json({ connected: false, details: message });
  }
});

app.use((req, res, next) => {
  const open =
    req.path === '/' ||
    req.path.startsWith('/check/') ||
    (req.path === '/auth/sign-up' && req.method === 'POST') ||
    (req.path === '/auth/sign-in' && req.method === 'POST') ||
    (req.path === '/auth/verify-email' && req.method === 'GET');

  if (open) return next();
  return authMiddleware(req, res, next);
});

app.use('/auth', authRouter);
app.use('/users', usersRouter);

app.listen(config.port, () => {
  console.log(`Example app listening on port ${config.port}`);
});
