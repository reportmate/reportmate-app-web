import { NextApiRequest, NextApiResponse } from 'next';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

/**
 * API handler for individual Machine Group operations
 * 
 * GET /api/machine-groups/[id] - Get specific machine group
 * PUT /api/machine-groups/[id] - Update specific machine group
 * DELETE /api/machine-groups/[id] - Delete specific machine group
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Temporarily disabled during build restructure
  return res.status(503).json({ error: 'Machine Group API temporarily unavailable' });
}

