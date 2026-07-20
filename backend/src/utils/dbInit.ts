import { prisma } from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

async function runPrismaMigrations() {
  console.log('🔄 Applying Prisma migrations (prisma migrate deploy)...');
  try {
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
    });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log('✅ Prisma migrations applied.');
    return true;
  } catch (err) {
    console.error('❌ prisma migrate deploy failed:', err);
    return false;
  }
}

async function fallbackDbPush() {
  console.log('🔧 Falling back to prisma db push to sync schema...');
  try {
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss', {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
    });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log('✅ prisma db push completed.');
    return true;
  } catch (err) {
    console.error('❌ prisma db push failed:', err);
    return false;
  }
}

export async function autoInitializeDatabase() {
  console.log('🔍 Checking database initialization...');

  try {
    // 0. Attempt to apply migrations first
    const migrated = await runPrismaMigrations();
    if (!migrated) {
      // If migrate deploy fails (e.g., in dev or missing migrations), try db push as a fallback
      await fallbackDbPush();
    }

    // 1. Check if Super Admin exists
    const superAdminEmail = 'dnyansetucorporate@gmail.com';
    const existingAdmin = await prisma.user.findUnique({
      where: { email: superAdminEmail },
    });

    if (!existingAdmin) {
      console.log('➕ Creating Super Admin...');
      const hashedPassword = await bcrypt.hash('Super@123', 12);
      await prisma.user.create({
        data: {
          email: superAdminEmail,
          name: 'Super Admin',
          passwordHash: hashedPassword,
          role: 'SUPER_ADMIN',
        },
      });
      console.log('✅ Super Admin created.');
    } else {
      console.log('ℹ️ Super Admin already exists.');
    }

    console.log('🚀 Database initialization check complete.');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    // We don't exit the process here to allow the server to still try and start,
    // but the error is logged.
  }
}
