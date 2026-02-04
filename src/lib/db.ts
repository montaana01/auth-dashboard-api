import pgPromise from 'pg-promise';
import { config } from '../config.js';

const pgp = pgPromise({});

export const db = config.postgresUri ? pgp(config.postgresUri) : null;

export const pingDb = async (): Promise<{ connected: boolean; details: string }> => {
  if (!db) {
    return {
      connected: false,
      details: 'Something went wrong with PostgreSQL!',
    };
  }

  const result = await db.one<{ now: string }>('SELECT NOW() AS now');
  return {
    connected: true,
    details: result.now,
  };
};
