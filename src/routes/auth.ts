import { Router } from 'express';

export const authRouter = Router();

authRouter.post('/sign-up', (req, res) => {
  res.status(200).json({
    ok: true,
    endpoint: 'auth/sign-up',
    message: 'Static sign-up response',
    body: req.body,
  });
});

authRouter.post('/sign-in', (req, res) => {
  res.status(200).json({
    ok: true,
    endpoint: 'auth/sign-in',
    message: 'Static sign-in response',
    body: req.body,
  });
});
