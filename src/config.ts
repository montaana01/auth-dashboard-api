const postgresUri =
  process.env.NF_AUTH_DASHBOARD_POSTGRES_URI ||
  process.env.NF_AUTH_DASHBOARD_JDBC_POSTGRES_URI ||
  process.env.NF_AUTH_DASHBOARD_POSTGRES_URI_ADMIN ||
  process.env.NF_AUTH_DASHBOARD_JDBC_POSTGRES_URI_ADMIN ||
  process.env.EXTERNAL_POSTGRES_URI ||
  '';

export const config = {
  port: process.env.PORT ?? '3000',
  postgresUri,
};
