import { NextApiRequest, NextApiResponse } from 'next';
// import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// const prisma = new PrismaClient();

/**
 * API handler for Machine Groups management
 * 
 * GET /api/machine-groups - List all machine groups
 * POST /api/machine-groups - Create a new machine group
 * PUT /api/machine-groups/[id] - Update machine group
 * DELETE /api/machine-groups/[id] - Delete machine group
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Temporarily disabled during build restructure
  return res.status(503).json({ error: 'Machine Groups API temporarily unavailable' });
  
  /*
  try {
    switch (req.method) {
      case 'GET':
        return await getMachineGroups(req, res);
      case 'POST':
        return await createMachineGroup(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Machine Groups API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
  */
}

async function getMachineGroups(req: NextApiRequest, res: NextApiResponse) {
  return res.status(503).json({ error: 'Temporarily disabled' });
}

async function createMachineGroup(req: NextApiRequest, res: NextApiResponse) {
  return res.status(503).json({ error: 'Temporarily disabled' });
}

/**
 * Generate a random passphrase in GUID format (similar to MunkiReport)
 */
export function generateGuidPassphrase(): string {
  return crypto.randomUUID().toUpperCase();
}

/**
 * Hash a passphrase using SHA-256
 */
export function hashPassphrase(passphrase: string): string {
  return crypto.createHash('sha256').update(passphrase).digest('hex');
}
