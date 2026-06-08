import { Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { loginUser, getProfileFromPayload, generateRefreshToken, verifyRefreshToken, revokeRefreshToken } from './auth.service.js';
import { config } from '../../config/index.js';
import type { Request } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

// POST /api/auth/login
export const login = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await loginUser(req.body);

  // Issue refresh token as httpOnly cookie
  try {
    const refresh = await generateRefreshToken(result.user.id);
    res.cookie('refreshToken', refresh, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/api/auth',
    });
  } catch (e) {
    // If refresh token creation fails, log but continue returning access token
    console.error('Failed to create refresh token', e);
  }

  sendSuccess(res, result, 'Login successful');
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await getProfileFromPayload(req.user!);
  sendSuccess(res, user);
});

// POST /api/auth/refresh
export const refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  const rec = await verifyRefreshToken(token);

  // rotate refresh token
  await revokeRefreshToken(rec.id);
  const newToken = await generateRefreshToken(rec.userId);
  res.cookie('refreshToken', newToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  // issue a fresh access token
  const userPayload = { sub: rec.userId } as any;
  const access = await (async () => {
    // minimal payload: lookup user to fill role/email
    const profile = await getProfileFromPayload(userPayload);
    const { signToken } = await import('../../utils/jwt.js');
    return signToken({ sub: profile.id, email: (profile as any).email, role: (profile as any).role } as any);
  })();

  sendSuccess(res, { accessToken: access }, 'Token refreshed');
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (token) {
    try {
      const rec = await verifyRefreshToken(token);
      await revokeRefreshToken(rec.id);
    } catch {
      // ignore
    }
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  sendSuccess(res, null, 'Logged out');
});
