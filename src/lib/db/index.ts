// Database factory — switches between JSON and Prisma implementations
// based on DATABASE environment variable

import { DatabaseInterface } from './interface';
import { JsonDatabase } from './json';

let dbInstance: DatabaseInterface | null = null;

export function getDatabase(): DatabaseInterface {
  if (dbInstance) return dbInstance;

  const dbType = process.env.DATABASE || 'prisma';

  if (dbType === 'json') {
    dbInstance = new JsonDatabase();
    return dbInstance;
  }

  // Lazy-load Prisma to avoid import issues in JSON-only mode
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaDatabase } = require('./prisma');
  dbInstance = new PrismaDatabase();
  return dbInstance;
}
