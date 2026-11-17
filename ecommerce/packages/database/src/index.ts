import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";

/** Um único cliente por processo (evita esgotar conexões no modo dev do Next.js). */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * O esquema do PostgreSQL vem do próprio endereço (?schema=loja), como no Prisma Migrate.
 * No Supabase as tabelas ficam no esquema "loja", fora da API pública (que só expõe "public").
 */
export function createPrismaClient(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) throw new Error("DATABASE_URL não configurada");
  const schema = new URL(connectionString).searchParams.get("schema") ?? undefined;
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }, schema ? { schema } : undefined) });
}

export function getPrisma(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
export { loadCatalogFromDatabase } from "./catalog";
