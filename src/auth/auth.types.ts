export interface ISession {
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}
