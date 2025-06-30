import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * API handler for Machine Groups management
 * 
 * GET /api/machine-groups - List all machine groups
 * POST /api/machine-groups - Create a new machine group
 * PUT /api/machine-groups/[id] - Update machine group
 * DELETE /api/machine-groups/[id] - Delete machine group
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
}

async function getMachineGroups(req: NextApiRequest, res: NextApiResponse) {
  const { businessUnitId } = req.query;

  const whereClause = businessUnitId ? {
    businessUnitId: parseInt(businessUnitId as string)
  } : {};

  const machineGroups = await prisma.machineGroup.findMany({
    where: whereClause,
    include: {
      businessUnit: {
        select: {
          id: true,
          name: true
        }
      },
      devices: {
        select: {
          id: true,
          name: true,
          status: true,
          lastSeen: true
        }
      },
      _count: {
        select: {
          devices: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Don't return the actual passphrase hash for security
  const sanitizedGroups = machineGroups.map(group => ({
    ...group,
    passphraseHash: group.passphraseHash ? '[PROTECTED]' : null,
    hasPassphrase: !!group.passphraseHash
  }));

  return res.status(200).json(sanitizedGroups);
}

async function createMachineGroup(req: NextApiRequest, res: NextApiResponse) {
  const { name, description, passphrase, businessUnitId } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Machine group name is required' });
  }

  if (!passphrase) {
    return res.status(400).json({ error: 'Passphrase is required for machine group' });
  }

  // Generate SHA-256 hash of the passphrase
  const passphraseHash = crypto.createHash('sha256').update(passphrase).digest('hex');

  // Check if a machine group with this passphrase hash already exists
  const existingByHash = await prisma.machineGroup.findFirst({
    where: { passphraseHash }
  });

  if (existingByHash) {
    return res.status(409).json({ error: 'Machine group with this passphrase already exists' });
  }

  const data: any = {
    name,
    description,
    passphraseHash
  };

  if (businessUnitId) {
    data.businessUnitId = parseInt(businessUnitId);
  }

  const machineGroup = await prisma.machineGroup.create({
    data,
    include: {
      businessUnit: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          devices: true
        }
      }
    }
  });

  // Don't return the actual passphrase hash for security
  const sanitizedGroup = {
    ...machineGroup,
    passphraseHash: '[PROTECTED]',
    hasPassphrase: true
  };

  return res.status(201).json(sanitizedGroup);
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
