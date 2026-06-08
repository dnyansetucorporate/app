import { prisma } from '../config/prisma.js';

/**
 * Builds the per-branch / per-year prefix for a student certificate number.
 * Format: DYAN/<branchCode>/<year>/
 */
export const buildCertNoPrefix = (branchCode: string, date: Date): string =>
  `DYAN/${branchCode}/${date.getFullYear()}/`;

/**
 * Generates the next sequential student certificate number for a branch in a
 * given year, e.g. `DYAN/10254/2026/0001`.
 *
 * The sequence is derived from the count of certificates already issued for the
 * same branch + year. Callers should create the certificate inside a retry loop
 * so that the unique constraint on `certNo` resolves any race conditions.
 */
export const generateCertNo = async (
  branchId: string,
  date: Date = new Date(),
  client: { branch: any; certificate: any } = prisma,
): Promise<string> => {
  const branch = await client.branch.findUnique({
    where: { id: branchId },
    select: { branchCode: true },
  });
  const branchCode = branch?.branchCode ?? 'XXXXX';
  const prefix = buildCertNoPrefix(branchCode, date);

  const existing = await client.certificate.count({
    where: { branchId, certNo: { startsWith: prefix } },
  });

  const seq = String(existing + 1).padStart(4, '0');
  return `${prefix}${seq}`;
};
