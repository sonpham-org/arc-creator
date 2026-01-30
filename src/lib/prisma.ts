import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    return new PrismaClient()
  }
  
  // Railway and mostly managed Postgres require SSL in production
  const isProduction = process.env.NODE_ENV === 'production'
  const pool = new Pool({ 
    connectionString,
    max: isProduction ? 10 : 1,
    ssl: isProduction ? { rejectUnauthorized: false } : false
  })
  
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
