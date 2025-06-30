import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * API handler for individual Machine Group operations
 * 
 * GET /api/machine-groups/[id] - Get specific machine group
 * PUT /api/machine-groups/[id] - Update specific machine group
 * DELETE /api/machine-groups/[id] - Delete specific machine group
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const machineGroupId = parseInt(id as string);

  if (isNaN(machineGroupId)) {
    return res.status(400).json({ error: 'Invalid machine group ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getMachineGroup(machineGroupId, res);
      case 'PUT':
        return await updateMachineGroup(machineGroupId, req, res);
      case 'DELETE':
        return await deleteMachineGroup(machineGroupId, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Machine Group API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getMachineGroup(id: number, res: NextApiResponse) {
  const machineGroup = await prisma.machineGroup.findUnique({
    where: { id },
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
          lastSeen: true,
          serialNumber: true,
          os: true
        }
      },
      _count: {
        select: {
          devices: true
        }
      }
    }
  });

  if (!machineGroup) {
    return res.status(404).json({ error: 'Machine group not found' });
  }

  // Don't return the actual passphrase hash for security
  const sanitizedGroup = {
    ...machineGroup,
    passphraseHash: '[PROTECTED]',
    hasPassphrase: !!machineGroup.passphraseHash
  };

  return res.status(200).json(sanitizedGroup);
}

async function updateMachineGroup(id: number, req: NextApiRequest, res: NextApiResponse) {
  const { name, description, passphrase, businessUnitId } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Machine group name is required' });
  }

  // Check if machine group exists
  const existing = await prisma.machineGroup.findUnique({
    where: { id }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Machine group not found' });
  }

  const updateData: any = {
    name,
    description
  };

  // Update passphrase if provided
  if (passphrase) {
    const passphraseHash = crypto.createHash('sha256').update(passphrase).digest('hex');
    
    // Check if another machine group uses this passphrase
    const passphraseConflict = await prisma.machineGroup.findFirst({
      where: {
        passphraseHash,
        id: { not: id }
      }
    });

    if (passphraseConflict) {
      return res.status(409).json({ error: 'Another machine group already uses this passphrase' });
    }

    updateData.passphraseHash = passphraseHash;
  }

  // Update business unit assignment
  if (businessUnitId !== undefined) {
    updateData.businessUnitId = businessUnitId ? parseInt(businessUnitId) : null;
  }

  const machineGroup = await prisma.machineGroup.update({
    where: { id },
    data: updateData,
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
    hasPassphrase: !!machineGroup.passphraseHash
  };

  return res.status(200).json(sanitizedGroup);
}

async function deleteMachineGroup(id: number, res: NextApiResponse) {
  // Check if machine group exists
  const existing = await prisma.machineGroup.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          devices: true
        }
      }
    }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Machine group not found' });
  }

  // Check if machine group has devices
  if (existing._count.devices > 0) {
    return res.status(409).json({ 
      error: 'Cannot delete machine group with associated devices. Move devices to another group first.' 
    });
  }

  await prisma.machineGroup.delete({
    where: { id }
  });

  return res.status(204).end();
}
