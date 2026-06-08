import app from './app';
import dotenv from 'dotenv';
import { autoInitializeDatabase } from './utils/dbInit.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  // Auto-run seeds on startup
  await autoInitializeDatabase();

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    server.close(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

startServer();
