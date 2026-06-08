import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface JwtPayload {
  sub: string;       // user id (User.id)
  email: string;
  role: string;      // 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'STUDENT'
  branchId?: string; // set for BRANCH_ADMIN
  studentId?: string;// set for STUDENT (Student.id — not User.id)
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as string,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
};
