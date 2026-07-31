import { execFile, exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = util.promisify(execFile);
const execAsync = util.promisify(exec);

/**
 * Runs tar with paths relative to `cwd` rather than absolute. Windows' built-in
 * tar.exe (bsdtar) misparses an absolute path like "C:\foo" as a remote "host:path"
 * spec (and has no --force-local escape hatch), so any absolute Windows path passed
 * as an argument breaks it. Relative paths sidestep the issue on every platform.
 */
const tarLocal = (args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> =>
  execFileAsync('tar', args, { cwd });

const TMP_DIR = path.join(process.cwd(), 'tmp');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

interface PgConnection {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

const parsePgConnection = (): PgConnection => {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is not configured');

  const url = new URL(raw);
  return {
    host: url.hostname,
    port: url.port || '5432',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
  };
};

export interface BackupArchive {
  filePath: string;
  filename: string;
  cleanup: () => void;
}

/**
 * Builds a single .tar.gz containing a full Postgres dump (database.dump),
 * the uploads/ directory (uploads.tar.gz), and a manifest.json.
 */
export const createBackupArchive = async (): Promise<BackupArchive> => {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const conn = parsePgConnection();
  const workDir = fs.mkdtempSync(path.join(TMP_DIR, 'backup-'));

  try {
    const dumpPath = path.join(workDir, 'database.dump');
    await execFileAsync(
      'pg_dump',
      ['-h', conn.host, '-p', conn.port, '-U', conn.user, '-d', conn.database, '-F', 'c', '-f', dumpPath],
      { env: { ...process.env, PGPASSWORD: conn.password } }
    );

    const uploadsArchivePath = path.join(workDir, 'uploads.tar.gz');
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    await tarLocal(['-czf', path.relative(process.cwd(), uploadsArchivePath), 'uploads'], process.cwd());

    const createdAt = new Date().toISOString();
    fs.writeFileSync(
      path.join(workDir, 'manifest.json'),
      JSON.stringify({ createdAt, appVersion: process.env.npm_package_version || 'unknown' }, null, 2)
    );

    const filename = `backup-${createdAt.replace(/[:.]/g, '-')}.tar.gz`;
    const bundlePath = path.join(TMP_DIR, filename);
    await tarLocal(
      ['-czf', path.relative(workDir, bundlePath), 'database.dump', 'uploads.tar.gz', 'manifest.json'],
      workDir
    );

    return {
      filePath: bundlePath,
      filename,
      cleanup: () => {
        fs.rmSync(workDir, { recursive: true, force: true });
        fs.rmSync(bundlePath, { force: true });
      },
    };
  } catch (err) {
    fs.rmSync(workDir, { recursive: true, force: true });
    throw err;
  }
};

/**
 * Restores a bundle produced by createBackupArchive: replaces the live database
 * and the uploads/ directory. Not fully atomic across DB + files — callers should
 * recommend exporting a fresh backup immediately before restoring.
 */
export const restoreBackupArchive = async (uploadedFilePath: string): Promise<void> => {
  const conn = parsePgConnection();
  const extractDir = fs.mkdtempSync(path.join(TMP_DIR, 'restore-extract-'));
  let rolledBackUploadsDir: string | null = null;

  try {
    await tarLocal(['-xzf', path.relative(extractDir, uploadedFilePath)], extractDir);

    const manifestPath = path.join(extractDir, 'manifest.json');
    const dumpPath = path.join(extractDir, 'database.dump');
    const uploadsArchivePath = path.join(extractDir, 'uploads.tar.gz');

    if (!fs.existsSync(manifestPath) || !fs.existsSync(dumpPath) || !fs.existsSync(uploadsArchivePath)) {
      throw new Error('Invalid backup archive — expected manifest.json, database.dump, and uploads.tar.gz');
    }

    await execFileAsync(
      'pg_restore',
      [
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-privileges',
        '-h', conn.host,
        '-p', conn.port,
        '-U', conn.user,
        '-d', conn.database,
        dumpPath,
      ],
      { env: { ...process.env, PGPASSWORD: conn.password } }
    );

    // uploads/ is a Docker volume mount point, possibly on a different device than
    // anywhere outside it — renaming across devices throws EXDEV and renaming the
    // mount point itself throws EBUSY. So back up by copying (not renaming) its
    // contents into a hidden folder *inside* the same mount, which is always on
    // the same device.
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const existingEntries = fs.readdirSync(UPLOADS_DIR);
    rolledBackUploadsDir = path.join(UPLOADS_DIR, `.restore-backup-${Date.now()}`);
    fs.mkdirSync(rolledBackUploadsDir, { recursive: true });
    for (const entry of existingEntries) {
      fs.cpSync(path.join(UPLOADS_DIR, entry), path.join(rolledBackUploadsDir, entry), { recursive: true });
      fs.rmSync(path.join(UPLOADS_DIR, entry), { recursive: true, force: true });
    }

    try {
      await tarLocal(['-xzf', path.relative(process.cwd(), uploadsArchivePath)], process.cwd());
    } catch (extractErr) {
      for (const entry of fs.readdirSync(UPLOADS_DIR)) {
        if (path.join(UPLOADS_DIR, entry) === rolledBackUploadsDir) continue;
        fs.rmSync(path.join(UPLOADS_DIR, entry), { recursive: true, force: true });
      }
      for (const entry of fs.readdirSync(rolledBackUploadsDir)) {
        fs.cpSync(path.join(rolledBackUploadsDir, entry), path.join(UPLOADS_DIR, entry), { recursive: true });
      }
      fs.rmSync(rolledBackUploadsDir, { recursive: true, force: true });
      rolledBackUploadsDir = null;
      throw extractErr;
    }

    await execAsync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
    });

    if (rolledBackUploadsDir) {
      fs.rmSync(rolledBackUploadsDir, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
};
