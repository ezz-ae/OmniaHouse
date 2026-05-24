import { PrismaClient } from '@prisma/client';

/**
 * Prisma client — one instance, reused everywhere.
 *
 * In dev, Next.js hot-reloads every save. Without this singleton each
 * reload spawns a fresh client and the pool quickly exhausts Supabase's
 * connection budget. We hang the instance off `globalThis` so the
 * dev-only module reuse keeps the same connections.
 *
 * In production each Lambda gets a fresh process, so the global is
 * a no-op there.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * True when Vercel's Supabase integration has injected the connection
 * URLs. API routes check this and fall back to mock data when false.
 */
export function isDatabaseConfigured(): boolean {
  return !!(process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL);
}
