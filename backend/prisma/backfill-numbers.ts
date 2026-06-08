/**
 * One-time backfill for certificate numbers (certNo) and branch ATP numbers (atpNo).
 * Run after migrating the schema:  npx tsx prisma/backfill-numbers.ts
 */
import { prisma } from '../src/config/prisma.js';
import { buildCertNoPrefix } from '../src/utils/certNumber.js';

async function main() {
  // 1. Branches → atpNo = DYAN/ATP/<branchCode>
  const branches = await prisma.branch.findMany({
    where: { atpNo: null },
    select: { id: true, branchCode: true },
  });
  for (const b of branches) {
    await prisma.branch.update({
      where: { id: b.id },
      data: { atpNo: `DYAN/ATP/${b.branchCode}` },
    });
  }
  console.log(`✓ Backfilled atpNo for ${branches.length} branch(es)`);

  // 2. Certificates → certNo = DYAN/<branchCode>/<year>/<seq> (chronological)
  const certs = await prisma.certificate.findMany({
    where: { certNo: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      branchId: true,
      issuedAt: true,
      createdAt: true,
      branch: { select: { branchCode: true } },
    },
  });

  const seqMap = new Map<string, number>();
  let count = 0;
  for (const c of certs) {
    const date = c.issuedAt ?? c.createdAt;
    const prefix = buildCertNoPrefix(c.branch.branchCode, date);
    if (!seqMap.has(prefix)) {
      const existing = await prisma.certificate.count({
        where: { branchId: c.branchId, certNo: { startsWith: prefix } },
      });
      seqMap.set(prefix, existing);
    }
    const next = (seqMap.get(prefix) ?? 0) + 1;
    seqMap.set(prefix, next);
    const certNo = `${prefix}${String(next).padStart(4, '0')}`;
    await prisma.certificate.update({ where: { id: c.id }, data: { certNo } });
    count++;
  }
  console.log(`✓ Backfilled certNo for ${count} certificate(s)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  });
