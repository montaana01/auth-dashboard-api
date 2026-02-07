import express from 'express';
import { config } from './config.ts';
import { pingDb } from './lib/db.ts';
import { authRouter } from './routes/auth.ts';
import { usersRouter } from "./routes/users.js";

const app = express();
app.use(express.json());

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

app.use('/auth', authRouter);
app.use('/users', usersRouter);

app.listen(config.port, () => {
  console.log(`Example app listening on port ${config.port}`);
});
