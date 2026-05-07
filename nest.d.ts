import 'express-session';

declare module 'uuid';

declare module 'express-session' {
  interface SessionData {
    state?: string;
    codeVerifier: string;
    user?: {
      id: string;
      email: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    };
  }
}
