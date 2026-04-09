import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT guard — sets req.user if a valid token is present,
 * but does NOT throw if the token is missing or invalid.
 * Use for public endpoints that benefit from knowing the caller.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest<TUser = any>(_err: any, user: TUser): TUser {
    // Return user if present, null otherwise — never throw
    return user;
  }
}
