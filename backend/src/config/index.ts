import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
  },
};
