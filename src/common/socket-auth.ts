import type { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import type { JwtPayload } from '../modules/auth/auth.service.js';

/** Verify a socket handshake's access token; refresh tokens are rejected. */
export function authenticateSocket(
  client: Socket,
  jwt: JwtService,
  secret: string,
): JwtPayload | null {
  const token =
    (client.handshake.auth?.token as string | undefined) ??
    (client.handshake.query?.token as string | undefined);
  if (!token) return null;
  try {
    const payload = jwt.verify<JwtPayload & { type?: string }>(token, {
      secret,
    });
    if (payload.type === 'refresh' || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}
