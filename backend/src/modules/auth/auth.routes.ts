import { Router } from 'express';
import { login, getMe, refreshToken, logout } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { loginSchema } from './auth.schema.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Apply a simple rate limiter on login to mitigate brute-force
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // limit each IP to 10 requests per windowMs
	standardHeaders: true,
	legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, validate(loginSchema), login);

// POST /api/auth/refresh
router.post('/refresh', refreshToken);

// POST /api/auth/logout
router.post('/logout', authenticate, logout);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

export default router;
