import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

const ACCESS_TOKEN_EXPIRATION_BUFFER_MS = 5000;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const session = req.session;

    if (!session?.tokens) {
      throw new UnauthorizedException();
    }

    const isTokenExpiringSoon =
      Date.now() > session.tokens.expiresAt - ACCESS_TOKEN_EXPIRATION_BUFFER_MS;

    if (isTokenExpiringSoon) {
      try {
        await this.authService.refreshToken(session);
      } catch {
        await new Promise((resolve) => session.destroy(resolve));
        throw new UnauthorizedException();
      }
    }

    return true;
  }
}
