import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Super Admin
  const hashedPassword = await bcrypt.hash('Super@123', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'dnyansetucorporate@gmail.com' },
    update: {},
    create: {
      email: 'dnyansetucorporate@gmail.com',
      name: 'Super Admin',
      passwordHash: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('Super Admin created:', superAdmin.email);

  // Add some initial courses
  const courses = [
    { name: 'Basic Computer', description: 'Fundamental course for beginners' },
    { name: 'Computer Applications', description: 'Advanced office and system applications' },
    { name: 'Graphic Design', description: 'Adobe Suite and design principles' },
  ];

  for (const course of courses) {
    await prisma.course.upsert({
      where: { name: course.name },
      update: {},
      create: course,
    });
  }

  console.log('Default courses seeded.');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
