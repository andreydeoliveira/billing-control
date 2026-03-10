import { PrismaClient } from "@/generated/prisma/client";
import fs from "node:fs";
import path from "node:path";

function findProjectRoot(startDir: string): string {
	let current = startDir;

	for (let i = 0; i < 20; i++) {
		const pkg = path.join(current, "package.json");
		const prismaSchema = path.join(current, "prisma", "schema.prisma");
		if (fs.existsSync(pkg) && fs.existsSync(prismaSchema)) return current;

		const parent = path.dirname(current);
		if (parent === current) break;
		current = parent;
	}

	return startDir;
}

function resolveSqliteUrl(databaseUrl: string): string {
	if (!databaseUrl.startsWith("file:")) return databaseUrl;

	const filePath = databaseUrl.slice("file:".length);
	const isRelative = filePath.startsWith("./") || filePath.startsWith("../");
	if (!isRelative) return databaseUrl;

	const baseDir =
		process.env.INIT_CWD || findProjectRoot(process.cwd()) || process.cwd();
	const absolutePath = path.resolve(baseDir, filePath);
	return `file:${absolutePath.replace(/\\/g, "/")}`;
}

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const datasourceUrl = process.env.DATABASE_URL
	? resolveSqliteUrl(process.env.DATABASE_URL)
	: undefined;

export const prisma =
	globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
