import { Controller, Get, Req, Res, Query, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

export const ONE_MINUTES_IN_MS = 60000;
const LIMIT_REQUEST_BY_IP = 10;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  @Throttle({ default: { limit: LIMIT_REQUEST_BY_IP, ttl: ONE_MINUTES_IN_MS } })
  login(@Req() req: Request, @Res() res: Response) {
    const url = this.authService.createLoginUrl(req);
    return res.redirect(url);
  }

  @Get('callback')
  @Throttle({ default: { limit: LIMIT_REQUEST_BY_IP, ttl: ONE_MINUTES_IN_MS } })
  async callback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    await this.authService.handleCallback(req, code, state);
    return res.redirect('http://localhost:9000/dashboard');
  }

  @Get('session')
  @UseGuards(AuthGuard)
  getSession(@Req() req: Request) {
    return {
      authenticated: true,
      user: {
        id: req.session.user.id,
        email: req.session.user.email,
      },
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req: Request) {
    await this.authService.logout(req);
    return { ok: true };
  }

  @Get('csrf')
  csrf(@Req() req: Request) {
    return { csrfToken: req.csrfToken() };
  }
}
