/**
 * Browser origins allowed to call the API and open sockets:
 * FRONTEND_URL, ADMIN_URL and any extra comma-separated CORS_ORIGINS.
 */
export function allowedOrigins(): string[] {
  return [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    ...(process.env.CORS_ORIGINS ?? '').split(','),
  ]
    .map((o) => (o ?? '').trim().replace(/\/$/, ''))
    .filter(Boolean);
}
