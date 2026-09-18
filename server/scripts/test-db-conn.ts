import { prisma } from '../src/config/prisma';

async function main() {
  console.log('Connecting to database...');
  const orgCount = await prisma.organization.count();
  const userCount = await prisma.user.count();
  console.log(`Connection successful! Organizations: ${orgCount}, Users: ${userCount}`);
}

main()
  .catch((err) => {
    console.error('Connection failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
