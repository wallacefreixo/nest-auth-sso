import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { createHash, randomBytes } from 'crypto';
import type { Request } from 'express';
import { ISession } from './auth.types';
import { UsersService } from '@/users/users.service';

const MILLISECONDS_IN_SECOND = 1000;

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  private get issuerBaseUrl() {
    return `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect`;
  }

  private get clientId() {
    return process.env.KEYCLOAK_CLIENT_ID;
  }

  private get clientSecret() {
    return process.env.KEYCLOAK_CLIENT_SECRET;
  }

  private get redirectUri() {
    return process.env.KEYCLOAK_REDIRECT_URI;
  }

  private calculateTokenExpiresAt(expiresInSeconds: number): number {
    return Date.now() + expiresInSeconds * MILLISECONDS_IN_SECOND;
  }

  private generateCodeVerifier() {
    return randomBytes(64).toString('hex');
  }

  private generateCodeChallenge(verifier: string) {
    return createHash('sha256').update(verifier).digest('base64url');
  }

  createLoginUrl(req: Request) {
    const state = randomBytes(32).toString('hex');

    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    req.session.state = state;
    req.session.codeVerifier = codeVerifier;

    const url = new URL(`${this.issuerBaseUrl}/auth`);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('state', state);

    // PKCE
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return url.toString();
  }

  async handleCallback(req: Request, code?: string, state?: string) {
    if (req.session.state !== state) {
      throw new UnauthorizedException();
    }

    const codeVerifier = req.session.codeVerifier;

    if (!codeVerifier) {
      throw new UnauthorizedException();
    }

    delete req.session.state;
    delete req.session.codeVerifier;

    const token = await axios.post(
      `${this.issuerBaseUrl}/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,

        // PKCE
        code_verifier: codeVerifier,
      }),
    );

    const userInfo = await axios.get(`${this.issuerBaseUrl}/userinfo`, {
      headers: {
        Authorization: `Bearer ${token.data.access_token}`,
      },
    });

    const data = userInfo.data;

    const user = await this.usersService.createOrUpdateFromSSO({
      providerUserId: data.sub,
      email: data.email,
    });

    req.session.user = user;

    req.session.tokens = {
      accessToken: token.data.access_token,
      refreshToken: token.data.refresh_token,
      expiresAt: this.calculateTokenExpiresAt(token.data.expires_in),
    };
  }

  async refreshToken(session: ISession) {
    const token = await axios.post(
      `${this.issuerBaseUrl}/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.tokens.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    );

    session.tokens = {
      accessToken: token.data.access_token,
      refreshToken: token.data.refresh_token,
      expiresAt: this.calculateTokenExpiresAt(token.data.expires_in),
    };
  }

  async logout(req: Request) {
    return new Promise((resolve) => {
      req.session.destroy(() => resolve(true));
    });
  }
}
