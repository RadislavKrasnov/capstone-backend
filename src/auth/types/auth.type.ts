import type { Request } from 'express';

export type AuthenticatedUser = {
  id: number;
  email: string;
};

export type RefreshTokenRequest = Request & {
  cookies: {
    refreshToken: string;
  };
};
