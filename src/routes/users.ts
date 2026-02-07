import { Router } from 'express';

export const usersRouter = Router();

usersRouter.post('/get-table', (req, res) => {
  res.status(200).json({
    ok: true,
    endpoint: 'user/get-table',
    message: 'Static get-table response',
    body: req.body,
  });
});