import 'dotenv/config';

const postgresUri =
  process.env.NF_AUTH_DASHBOARD_POSTGRES_URI ||
  process.env.EXTERNAL_POSTGRES_URI ||
  process.env.POSTGRES_URI;

export const config = {
  port: Number(process.env.PORT) ?? 3000,
  postgresUri,
};
