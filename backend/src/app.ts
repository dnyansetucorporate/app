import express, { Application, Request, Response } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { config } from './config/index.js';
import { errorHandler } from './middleware/error.middleware.js';

import authRoutes         from './modules/auth/auth.routes.js';
import branchRoutes       from './modules/branches/branches.routes.js';
import courseRoutes       from './modules/courses/courses.routes.js';
import studentRoutes      from './modules/students/students.routes.js';
import enrollmentRoutes   from './modules/enrollments/enrollments.routes.js';
import paymentRoutes      from './modules/payments/payments.routes.js';
import scheduleRoutes     from './modules/schedules/schedules.routes.js';
import examRoutes         from './modules/exams/exams.routes.js';
import certificateRoutes  from './modules/certificates/certificates.routes.js';
import dashboardRoutes    from './modules/users/dashboard.routes.js';
import studentPortalRoutes from './modules/student-portal/student-portal.routes.js';
import settingsRoutes       from './modules/settings/settings.routes.js';

dotenv.config();

const app: Application = express();

// ── Security & Parsing ────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files (so frontend can load /uploads/*)
// - Cross-Origin-Resource-Policy: cross-origin  → overrides Helmet's same-origin default
//   so the browser allows the frontend (localhost:5173) to render images from this origin
// - setHeaders: .jfif and extension-less files forced to image/jpeg because .jfif is
//   not in Node's mime-db and octet-stream would be blocked by nosniff
const JPEG_EXTENSIONS = new Set(['.jfif', '.jfi', '.jpe']);
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!ext || JPEG_EXTENSIONS.has(ext)) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
  },
}));

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────
const API = '/api';
app.use(`${API}/auth`,         authRoutes);
app.use(`${API}/branches`,     branchRoutes);
app.use(`${API}/courses`,      courseRoutes);
app.use(`${API}/students`,     studentRoutes);
app.use(`${API}/enrollments`,  enrollmentRoutes);
app.use(`${API}/payments`,     paymentRoutes);
app.use(`${API}/schedules`,    scheduleRoutes);
app.use(`${API}/exams`,        examRoutes);
app.use(`${API}/certificates`, certificateRoutes);
app.use(`${API}/dashboard`,    dashboardRoutes);
app.use(`${API}/student-portal`, studentPortalRoutes);
app.use(`${API}/settings`,      settingsRoutes);

// ── 404 ───────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

export default app;

