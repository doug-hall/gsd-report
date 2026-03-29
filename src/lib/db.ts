import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient>;
  productionPrisma: InstanceType<typeof PrismaClient> | null;
};

function createPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function initPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return createPrismaClient(connectionString);
}

function initProductionPrisma() {
  const connectionString = process.env.PRODUCTION_DATABASE_URL;
  if (!connectionString) return null;
  return createPrismaClient(connectionString);
}

export const prisma = globalForPrisma.prisma || initPrisma();
export const productionPrisma = globalForPrisma.productionPrisma ?? initProductionPrisma();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.productionPrisma = productionPrisma;
}
